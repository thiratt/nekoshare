use futures_util::{SinkExt, Stream, StreamExt};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Emitter};
use tauri_plugin_store::StoreExt;
use thiserror::Error;
use tokio::fs::File;
use tokio::io::{AsyncReadExt, AsyncWriteExt, BufWriter};
use tokio::time::{timeout, Duration};
use tokio_tungstenite::connect_async;
use tokio_tungstenite::tungstenite::client::IntoClientRequest;
use tokio_tungstenite::tungstenite::http::header::AUTHORIZATION;
use tokio_tungstenite::tungstenite::Message;
use uuid::Uuid;

use crate::core::socket::TransferConfig;
use crate::core::transfer_history::{
    persist_transfer_progress_event, TransferProgressEventPayload,
};

const STORE_FILE_NAME: &str = "nekoshare.json";
const SEND_PROGRESS_EMIT_STEP: u64 = 1024 * 1024;
const RECEIVE_PROGRESS_EMIT_STEP: u64 = 1024 * 1024;
const FRAME_FILE_START: u8 = 0x01;
const FRAME_CHUNK: u8 = 0x02;
const FRAME_FILE_END: u8 = 0x03;
const FRAME_TRANSFER_END: u8 = 0x04;
const RELAY_READY_TIMEOUT_SECS: u64 = 30;

#[derive(Debug, Error, Serialize)]
#[serde(tag = "type", content = "message")]
pub enum RelayTransferError {
    #[error("Relay connection failed: {0}")]
    Connection(String),
    #[error("Relay protocol error: {0}")]
    Protocol(String),
    #[error("Relay file error: {0}")]
    File(String),
}

impl From<std::io::Error> for RelayTransferError {
    fn from(value: std::io::Error) -> Self {
        RelayTransferError::File(value.to_string())
    }
}

impl From<tokio_tungstenite::tungstenite::Error> for RelayTransferError {
    fn from(value: tokio_tungstenite::tungstenite::Error) -> Self {
        RelayTransferError::Connection(value.to_string())
    }
}

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RelayFileInput {
    pub path: String,
    pub file_name: String,
    pub size: u64,
}

#[derive(Debug)]
pub struct RelaySendInput {
    pub transfer_id: String,
    pub relay_url: String,
    pub token: String,
    pub files: Vec<RelayFileInput>,
    pub target_device_id: String,
    pub source_user_id: Option<String>,
    pub source_user_name: Option<String>,
    pub source_device_id: String,
    pub source_device_name: Option<String>,
}

#[derive(Debug)]
pub struct RelayReceiveInput {
    pub transfer_id: String,
    pub relay_url: String,
    pub token: String,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct RelayFileMetadata {
    file_id: String,
    name: String,
    size: u64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RelayReadyMessage {
    r#type: String,
    transfer_id: String,
}

struct ReceiveState {
    writer: BufWriter<File>,
    file_id: String,
    file_name: String,
    final_path: PathBuf,
    partial_path: PathBuf,
    expected_size: u64,
    received_size: u64,
    last_emitted_size: u64,
}

#[derive(Debug)]
enum RelayFrame {
    FileStart(RelayFileMetadata),
    Chunk { file_id: String, bytes: Vec<u8> },
    FileEnd { file_id: String },
    TransferEnd,
}

fn now_timestamp_ms() -> i64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    match SystemTime::now().duration_since(UNIX_EPOCH) {
        Ok(duration) => duration.as_millis() as i64,
        Err(_) => 0,
    }
}

// Temporary compatibility helper for explicit fallback/testing only. Normal
// relay connects use Authorization: Bearer <token> during the WS handshake.
#[allow(dead_code)]
fn with_token_query(relay_url: &str, token: &str) -> Result<String, RelayTransferError> {
    let separator = if relay_url.contains('?') { '&' } else { '?' };
    Ok(format!("{relay_url}{separator}token={token}"))
}

fn redact_relay_url(relay_url: &str) -> String {
    match relay_url.split_once("token=") {
        Some((prefix, _)) => format!("{prefix}token=<redacted>"),
        None => relay_url.to_string(),
    }
}

fn relay_authorized_request(
    relay_url: &str,
    token: &str,
) -> Result<tokio_tungstenite::tungstenite::http::Request<()>, RelayTransferError> {
    let mut request = relay_url.into_client_request()?;
    let header_value = format!("Bearer {token}")
        .parse()
        .map_err(|e| RelayTransferError::Connection(format!("Invalid relay authorization header: {e}")))?;
    request.headers_mut().insert(AUTHORIZATION, header_value);
    Ok(request)
}

fn file_name_from_path(path: &Path) -> String {
    path.file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string()
}

fn push_u32_le(buffer: &mut Vec<u8>, value: usize) -> Result<(), RelayTransferError> {
    let value = u32::try_from(value)
        .map_err(|_| RelayTransferError::Protocol("Relay frame field is too large".to_string()))?;
    buffer.extend_from_slice(&value.to_le_bytes());
    Ok(())
}

fn read_u32_le(data: &[u8], offset: &mut usize) -> Result<usize, RelayTransferError> {
    if data.len().saturating_sub(*offset) < 4 {
        return Err(RelayTransferError::Protocol(
            "Relay frame is missing a length field".to_string(),
        ));
    }

    let value = u32::from_le_bytes([
        data[*offset],
        data[*offset + 1],
        data[*offset + 2],
        data[*offset + 3],
    ]) as usize;
    *offset += 4;
    Ok(value)
}

fn read_string(data: &[u8], offset: &mut usize) -> Result<String, RelayTransferError> {
    let len = read_u32_le(data, offset)?;
    if data.len().saturating_sub(*offset) < len {
        return Err(RelayTransferError::Protocol(
            "Relay frame string exceeds frame length".to_string(),
        ));
    }

    let value = std::str::from_utf8(&data[*offset..*offset + len])
        .map_err(|e| RelayTransferError::Protocol(e.to_string()))?
        .to_string();
    *offset += len;
    Ok(value)
}

// Relay frame format, intentionally ACK-free because the current server relay
// only forwards sender -> receiver binary frames:
// 0x01 file-start: [type][u32 json_len][json { fileId, name, size }]
// 0x02 chunk:      [type][u32 file_id_len][file_id utf8][chunk bytes]
// 0x03 file-end:   [type][u32 file_id_len][file_id utf8]
// 0x04 transfer-end: [type]
fn encode_file_start(metadata: &RelayFileMetadata) -> Result<Vec<u8>, RelayTransferError> {
    let json =
        serde_json::to_vec(metadata).map_err(|e| RelayTransferError::Protocol(e.to_string()))?;
    let mut buffer = Vec::with_capacity(1 + 4 + json.len());
    buffer.push(FRAME_FILE_START);
    push_u32_le(&mut buffer, json.len())?;
    buffer.extend_from_slice(&json);
    Ok(buffer)
}

fn encode_chunk(file_id: &str, bytes: &[u8]) -> Result<Vec<u8>, RelayTransferError> {
    let file_id_bytes = file_id.as_bytes();
    let mut buffer = Vec::with_capacity(1 + 4 + file_id_bytes.len() + bytes.len());
    buffer.push(FRAME_CHUNK);
    push_u32_le(&mut buffer, file_id_bytes.len())?;
    buffer.extend_from_slice(file_id_bytes);
    buffer.extend_from_slice(bytes);
    Ok(buffer)
}

fn encode_file_end(file_id: &str) -> Result<Vec<u8>, RelayTransferError> {
    let file_id_bytes = file_id.as_bytes();
    let mut buffer = Vec::with_capacity(1 + 4 + file_id_bytes.len());
    buffer.push(FRAME_FILE_END);
    push_u32_le(&mut buffer, file_id_bytes.len())?;
    buffer.extend_from_slice(file_id_bytes);
    Ok(buffer)
}

fn encode_transfer_end() -> Vec<u8> {
    vec![FRAME_TRANSFER_END]
}

fn decode_frame(data: &[u8]) -> Result<RelayFrame, RelayTransferError> {
    let frame_type = *data
        .first()
        .ok_or_else(|| RelayTransferError::Protocol("Relay frame is empty".to_string()))?;
    let mut offset = 1usize;

    match frame_type {
        FRAME_FILE_START => {
            let json_len = read_u32_le(data, &mut offset)?;
            if data.len().saturating_sub(offset) != json_len {
                return Err(RelayTransferError::Protocol(
                    "Relay file-start frame has invalid length".to_string(),
                ));
            }
            let metadata = serde_json::from_slice::<RelayFileMetadata>(&data[offset..])
                .map_err(|e| RelayTransferError::Protocol(e.to_string()))?;
            Ok(RelayFrame::FileStart(metadata))
        }
        FRAME_CHUNK => {
            let file_id = read_string(data, &mut offset)?;
            Ok(RelayFrame::Chunk {
                file_id,
                bytes: data[offset..].to_vec(),
            })
        }
        FRAME_FILE_END => {
            let file_id = read_string(data, &mut offset)?;
            if offset != data.len() {
                return Err(RelayTransferError::Protocol(
                    "Relay file-end frame has trailing bytes".to_string(),
                ));
            }
            Ok(RelayFrame::FileEnd { file_id })
        }
        FRAME_TRANSFER_END => Ok(RelayFrame::TransferEnd),
        _ => Err(RelayTransferError::Protocol(format!(
            "Unknown relay frame type {frame_type}"
        ))),
    }
}

async fn wait_for_relay_ready<S>(
    stream: &mut S,
    transfer_id: &str,
) -> Result<(), RelayTransferError>
where
    S: Stream<Item = Result<Message, tokio_tungstenite::tungstenite::Error>> + Unpin,
{
    log::info!("Relay sender waiting for relay-ready transfer={transfer_id}");

    let wait_result = timeout(Duration::from_secs(RELAY_READY_TIMEOUT_SECS), async {
        while let Some(message) = stream.next().await {
            let message = message?;
            let Message::Text(text) = message else {
                continue;
            };

            let parsed = serde_json::from_str::<RelayReadyMessage>(&text)
                .map_err(|error| RelayTransferError::Protocol(error.to_string()))?;
            if parsed.r#type == "relay-ready" && parsed.transfer_id == transfer_id {
                log::info!("Relay sender received relay-ready transfer={transfer_id}");
                return Ok(());
            }
        }

        Err(RelayTransferError::Connection(
            "Relay connection closed before relay-ready".to_string(),
        ))
    })
    .await;

    match wait_result {
        Ok(result) => result,
        Err(_) => Err(RelayTransferError::Connection(format!(
            "Timed out waiting for relay-ready after {RELAY_READY_TIMEOUT_SECS}s"
        ))),
    }
}

fn emit_event(app: &AppHandle, event: TransferProgressEventPayload) {
    persist_transfer_progress_event(event.clone());
    let _ = app.emit("transfer-progress", event);
}

fn emit_send_progress(
    app: &AppHandle,
    input: &RelaySendInput,
    file_id: &str,
    file_path: &str,
    file_name: &str,
    total_bytes: u64,
    sent_bytes: u64,
    status: &str,
    error: Option<String>,
) {
    let progress_percent = if total_bytes == 0 {
        100.0
    } else {
        ((sent_bytes as f64 / total_bytes as f64) * 100.0).min(100.0)
    };

    emit_event(
        app,
        TransferProgressEventPayload {
            transfer_id: input.transfer_id.clone(),
            file_id: file_id.to_string(),
            file_path: file_path.to_string(),
            file_name: file_name.to_string(),
            direction: "send".to_string(),
            source_user_id: input.source_user_id.clone(),
            source_user_name: input.source_user_name.clone(),
            source_device_id: Some(input.source_device_id.clone()),
            source_device_name: input.source_device_name.clone(),
            same_account: Some(true),
            target_device_id: input.target_device_id.clone(),
            total_bytes,
            sent_bytes,
            progress_percent,
            status: status.to_string(),
            error,
            timestamp_ms: now_timestamp_ms(),
        },
    );
}

fn emit_receive_progress(
    app: &AppHandle,
    transfer_id: &str,
    state: &ReceiveState,
    status: &str,
    error: Option<String>,
) {
    let progress_percent = if state.expected_size == 0 {
        100.0
    } else {
        ((state.received_size as f64 / state.expected_size as f64) * 100.0).min(100.0)
    };

    emit_event(
        app,
        TransferProgressEventPayload {
            transfer_id: transfer_id.to_string(),
            file_id: state.file_id.clone(),
            file_path: state.final_path.to_string_lossy().to_string(),
            file_name: state.file_name.clone(),
            direction: "receive".to_string(),
            source_user_id: None,
            source_user_name: None,
            source_device_id: None,
            source_device_name: None,
            same_account: None,
            target_device_id: String::new(),
            total_bytes: state.expected_size,
            sent_bytes: state.received_size,
            progress_percent,
            status: status.to_string(),
            error,
            timestamp_ms: now_timestamp_ms(),
        },
    );
}

fn emit_send_failure(app: &AppHandle, input: &RelaySendInput, error: &RelayTransferError) {
    emit_event(
        app,
        TransferProgressEventPayload {
            transfer_id: input.transfer_id.clone(),
            file_id: String::new(),
            file_path: String::new(),
            file_name: String::new(),
            direction: "send".to_string(),
            source_user_id: input.source_user_id.clone(),
            source_user_name: input.source_user_name.clone(),
            source_device_id: Some(input.source_device_id.clone()),
            source_device_name: input.source_device_name.clone(),
            same_account: Some(true),
            target_device_id: input.target_device_id.clone(),
            total_bytes: 0,
            sent_bytes: 0,
            progress_percent: 0.0,
            status: "failed".to_string(),
            error: Some(error.to_string()),
            timestamp_ms: now_timestamp_ms(),
        },
    );
}

fn emit_receive_failure(app: &AppHandle, input: &RelayReceiveInput, error: &RelayTransferError) {
    emit_event(
        app,
        TransferProgressEventPayload {
            transfer_id: input.transfer_id.clone(),
            file_id: String::new(),
            file_path: String::new(),
            file_name: String::new(),
            direction: "receive".to_string(),
            source_user_id: None,
            source_user_name: None,
            source_device_id: None,
            source_device_name: None,
            same_account: None,
            target_device_id: String::new(),
            total_bytes: 0,
            sent_bytes: 0,
            progress_percent: 0.0,
            status: "failed".to_string(),
            error: Some(error.to_string()),
            timestamp_ms: now_timestamp_ms(),
        },
    );
}

async fn load_receive_dir_from_store(app: &AppHandle) -> Option<PathBuf> {
    let store = match app.store(STORE_FILE_NAME) {
        Ok(store) => store,
        Err(e) => {
            log::warn!("Failed to open store {}: {}", STORE_FILE_NAME, e);
            return None;
        }
    };

    if let Err(e) = store.reload() {
        log::warn!("Failed to reload store {}: {}", STORE_FILE_NAME, e);
    }

    let raw_app_config = store.get("appConfig")?;
    raw_app_config
        .get("fileLocation")
        .and_then(serde_json::Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(PathBuf::from)
}

async fn resolve_receive_base_dir(app: &AppHandle) -> Result<PathBuf, RelayTransferError> {
    let user_dirs = directories::UserDirs::new()
        .ok_or_else(|| RelayTransferError::File("Failed to get user directories".to_string()))?;
    let default_download_dir = user_dirs
        .download_dir()
        .ok_or_else(|| RelayTransferError::File("Failed to get download directory".to_string()))?;

    let mut base_dir = load_receive_dir_from_store(app)
        .await
        .unwrap_or_else(|| default_download_dir.to_path_buf());

    if let Err(e) = tokio::fs::create_dir_all(&base_dir).await {
        log::warn!(
            "Failed to use configured relay receive directory {:?}: {}. Falling back to Downloads.",
            base_dir,
            e
        );
        base_dir = default_download_dir.to_path_buf();
        tokio::fs::create_dir_all(&base_dir).await?;
    }

    Ok(base_dir)
}

fn safe_file_name(name: &str) -> String {
    let sanitized = name
        .chars()
        .map(|c| match c {
            '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*' => '_',
            c if c.is_control() => '_',
            c => c,
        })
        .collect::<String>();

    let trimmed = sanitized.trim();
    if trimmed.is_empty() {
        "received-file".to_string()
    } else {
        trimmed.to_string()
    }
}

fn duplicate_file_name(file_name: &str, index: usize) -> String {
    let path = Path::new(file_name);
    let stem = path
        .file_stem()
        .and_then(|value| value.to_str())
        .filter(|value| !value.is_empty())
        .unwrap_or(file_name);
    let extension = path.extension().and_then(|value| value.to_str());

    match extension {
        Some(extension) if !extension.is_empty() => format!("{stem} ({index}).{extension}"),
        _ => format!("{stem} ({index})"),
    }
}

async fn resolve_available_receive_paths(
    base_dir: &Path,
    file_name: &str,
) -> Result<(String, PathBuf, PathBuf), RelayTransferError> {
    for index in 0..1000usize {
        let candidate_name = if index == 0 {
            file_name.to_string()
        } else {
            duplicate_file_name(file_name, index)
        };
        let final_path = base_dir.join(&candidate_name);
        let partial_path = PathBuf::from(format!("{}.neko-partial", final_path.to_string_lossy()));

        let final_exists = tokio::fs::try_exists(&final_path).await?;
        let partial_exists = tokio::fs::try_exists(&partial_path).await?;
        if !final_exists && !partial_exists {
            return Ok((candidate_name, final_path, partial_path));
        }
    }

    Err(RelayTransferError::File(
        "Could not allocate a unique receive filename".to_string(),
    ))
}

async fn start_receive_file(
    app: &AppHandle,
    transfer_id: &str,
    base_dir: &Path,
    metadata: RelayFileMetadata,
) -> Result<ReceiveState, RelayTransferError> {
    let requested_name = safe_file_name(&metadata.name);
    let (file_name, final_path, partial_path) =
        resolve_available_receive_paths(base_dir, &requested_name).await?;
    log::info!(
        "Relay file-start transfer={} file_id={} name={} size={} target={:?}",
        transfer_id,
        metadata.file_id,
        file_name,
        metadata.size,
        final_path
    );
    let file = File::create(&partial_path).await?;
    let writer = BufWriter::with_capacity(TransferConfig::global().write_buffer_size, file);

    let state = ReceiveState {
        writer,
        file_id: metadata.file_id,
        file_name,
        final_path,
        partial_path,
        expected_size: metadata.size,
        received_size: 0,
        last_emitted_size: 0,
    };

    emit_receive_progress(app, transfer_id, &state, "processing", None);
    Ok(state)
}

async fn finish_receive_file(
    app: &AppHandle,
    transfer_id: &str,
    mut state: ReceiveState,
) -> Result<(), RelayTransferError> {
    state.writer.flush().await?;
    if TransferConfig::global().sync_on_complete {
        state.writer.get_ref().sync_all().await?;
    }
    if state.expected_size > 0 && state.received_size < state.expected_size {
        return Err(RelayTransferError::Protocol(format!(
            "Relay file ended early: {} of {} bytes",
            state.received_size, state.expected_size
        )));
    }

    let file_id = state.file_id.clone();
    let file_name = state.file_name.clone();
    let final_path = state.final_path.clone();
    let partial_path = state.partial_path.clone();
    let expected_size = state.expected_size;
    let received_size = state.expected_size.max(state.received_size);

    drop(state.writer);

    log::info!(
        "Relay file-end transfer={} file_id={} received={} expected={} final={:?}",
        transfer_id,
        file_id,
        received_size,
        expected_size,
        final_path
    );
    tokio::fs::rename(&partial_path, &final_path).await?;
    emit_event(
        app,
        TransferProgressEventPayload {
            transfer_id: transfer_id.to_string(),
            file_id,
            file_path: final_path.to_string_lossy().to_string(),
            file_name,
            direction: "receive".to_string(),
            source_user_id: None,
            source_user_name: None,
            source_device_id: None,
            source_device_name: None,
            same_account: None,
            target_device_id: String::new(),
            total_bytes: expected_size,
            sent_bytes: received_size,
            progress_percent: 100.0,
            status: "success".to_string(),
            error: None,
            timestamp_ms: now_timestamp_ms(),
        },
    );

    Ok(())
}

pub async fn send_relay_files(
    app: AppHandle,
    input: RelaySendInput,
) -> Result<(), RelayTransferError> {
    let result = send_relay_files_inner(&app, &input).await;

    if let Err(error) = &result {
        emit_send_failure(&app, &input, error);
    }

    result
}

async fn send_relay_files_inner(
    app: &AppHandle,
    input: &RelaySendInput,
) -> Result<(), RelayTransferError> {
    let request = relay_authorized_request(&input.relay_url, &input.token)?;
    let (mut ws_stream, _) = connect_async(request).await?;

    log::info!(
        "Relay sender connected transfer={} url={}",
        input.transfer_id,
        redact_relay_url(&input.relay_url)
    );

    wait_for_relay_ready(&mut ws_stream, &input.transfer_id).await?;

    let (mut sink, _stream) = ws_stream.split();
    let chunk_size = TransferConfig::global().chunk_size;
    let mut buffer = vec![0u8; chunk_size];

    for file_input in &input.files {
        let path = Path::new(&file_input.path);
        let file_name = if file_input.file_name.trim().is_empty() {
            file_name_from_path(path)
        } else {
            file_input.file_name.clone()
        };
        let file_id = format!("{}:{}", input.transfer_id, Uuid::new_v4());
        let metadata = RelayFileMetadata {
            file_id: file_id.clone(),
            name: file_name.clone(),
            size: file_input.size,
        };

        log::info!(
            "Relay sender file-start transfer={} file_id={} name={} size={}",
            input.transfer_id,
            file_id,
            file_name,
            file_input.size
        );
        emit_send_progress(
            app,
            input,
            &file_id,
            &file_input.path,
            &file_name,
            file_input.size,
            0,
            "processing",
            None,
        );

        sink.send(Message::Binary(encode_file_start(&metadata)?))
            .await?;

        let mut file = File::open(path).await?;
        let mut sent_bytes = 0u64;
        let mut last_emitted_size = 0u64;

        loop {
            let read = file.read(&mut buffer).await?;
            if read == 0 {
                break;
            }

            sink.send(Message::Binary(encode_chunk(&file_id, &buffer[..read])?))
                .await?;
            sent_bytes += read as u64;

            let should_emit = sent_bytes == file_input.size
                || sent_bytes.saturating_sub(last_emitted_size) >= SEND_PROGRESS_EMIT_STEP;
            if should_emit {
                last_emitted_size = sent_bytes;
                emit_send_progress(
                    app,
                    input,
                    &file_id,
                    &file_input.path,
                    &file_name,
                    file_input.size,
                    sent_bytes,
                    "processing",
                    None,
                );
            }
        }

        sink.send(Message::Binary(encode_file_end(&file_id)?))
            .await?;
        log::info!(
            "Relay sender file-end transfer={} file_id={} sent={}",
            input.transfer_id,
            file_id,
            sent_bytes
        );
        emit_send_progress(
            app,
            input,
            &file_id,
            &file_input.path,
            &file_name,
            file_input.size,
            file_input.size.max(sent_bytes),
            "success",
            None,
        );
    }

    log::info!("Relay sender transfer-end transfer={}", input.transfer_id);
    sink.send(Message::Binary(encode_transfer_end())).await?;
    let _ = sink.close().await;
    Ok(())
}

pub async fn receive_relay_transfer(
    app: AppHandle,
    input: RelayReceiveInput,
) -> Result<(), RelayTransferError> {
    let result = receive_relay_transfer_inner(&app, &input).await;

    if let Err(error) = &result {
        emit_receive_failure(&app, &input, error);
    }

    result
}

async fn receive_relay_transfer_inner(
    app: &AppHandle,
    input: &RelayReceiveInput,
) -> Result<(), RelayTransferError> {
    let base_dir = resolve_receive_base_dir(app).await?;
    let request = relay_authorized_request(&input.relay_url, &input.token)?;

    let (ws_stream, _) = connect_async(request).await?;

    log::info!(
        "Relay receiver connected transfer={} url={}",
        input.transfer_id,
        redact_relay_url(&input.relay_url)
    );
    let (_sink, mut stream) = ws_stream.split();
    let mut active_file: Option<ReceiveState> = None;

    while let Some(message) = stream.next().await {
        let message = message?;
        let Message::Binary(data) = message else {
            continue;
        };

        match decode_frame(&data)? {
            RelayFrame::FileStart(metadata) => {
                if active_file.is_some() {
                    return Err(RelayTransferError::Protocol(
                        "Received file-start before previous file ended".to_string(),
                    ));
                }
                active_file =
                    Some(start_receive_file(app, &input.transfer_id, &base_dir, metadata).await?);
            }
            RelayFrame::Chunk { file_id, bytes } => {
                let state = active_file.as_mut().ok_or_else(|| {
                    RelayTransferError::Protocol(
                        "Received relay chunk before file-start".to_string(),
                    )
                })?;
                if state.file_id != file_id {
                    return Err(RelayTransferError::Protocol(
                        "Relay chunk file id does not match active file".to_string(),
                    ));
                }

                let next_size = state
                    .received_size
                    .checked_add(bytes.len() as u64)
                    .ok_or_else(|| {
                        RelayTransferError::Protocol(
                            "Relay file size overflowed local counter".to_string(),
                        )
                    })?;
                if next_size > state.expected_size {
                    return Err(RelayTransferError::Protocol(format!(
                        "Relay file exceeded expected size: {} of {} bytes",
                        next_size, state.expected_size
                    )));
                }

                state.writer.write_all(&bytes).await?;
                state.received_size = next_size;

                let should_emit = state.received_size == state.expected_size
                    || state.received_size.saturating_sub(state.last_emitted_size)
                        >= RECEIVE_PROGRESS_EMIT_STEP;
                if should_emit {
                    state.last_emitted_size = state.received_size;
                    emit_receive_progress(app, &input.transfer_id, state, "processing", None);
                }
            }
            RelayFrame::FileEnd { file_id } => {
                let state = active_file.take().ok_or_else(|| {
                    RelayTransferError::Protocol("Received file-end before file-start".to_string())
                })?;
                if state.file_id != file_id {
                    return Err(RelayTransferError::Protocol(
                        "Relay file-end id does not match active file".to_string(),
                    ));
                }
                finish_receive_file(app, &input.transfer_id, state).await?;
            }
            RelayFrame::TransferEnd => {
                if active_file.is_some() {
                    return Err(RelayTransferError::Protocol(
                        "Received transfer-end while a file is still active".to_string(),
                    ));
                }
                log::info!("Relay receiver transfer-end transfer={}", input.transfer_id);

                break;
            }
        }
    }

    Ok(())
}

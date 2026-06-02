use dashmap::DashMap;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::sync::RwLock as StdRwLock;
use tauri::{AppHandle, Emitter};
use tokio::fs::File;
use tokio::io::{AsyncWriteExt, BufWriter};
use tokio::sync::{Mutex, RwLock};

use crate::core::socket::{BinaryReader, Connection, PacketRouter, PacketType, SocketResult};
use crate::core::socket::{SocketError, TransferConfig};
use crate::core::transfer_history::{
    persist_transfer_progress_event, TransferProgressEventPayload,
};
use crate::state::GlobalState;

struct TransferState {
    writer: Mutex<BufWriter<File>>,
    final_path: PathBuf,
    partial_path: PathBuf,
    file_name: String,
    file_id: String,
    transfer_id: String,
    expected_size: u64,
    received_size: AtomicU64,
    last_emitted_size: AtomicU64,
}

type TransferMap = DashMap<(String, String), Arc<TransferState>>;

const RECEIVE_PROGRESS_EMIT_STEP: u64 = 1024 * 1024;

pub struct FileTransferService {
    active_transfers: TransferMap,
    receive_base_dir: RwLock<Option<PathBuf>>,
    event_app_handle: StdRwLock<Option<AppHandle>>,
}

impl FileTransferService {
    pub fn new() -> Self {
        Self {
            active_transfers: DashMap::new(),
            receive_base_dir: RwLock::new(None),
            event_app_handle: StdRwLock::new(None),
        }
    }
}

pub async fn set_receive_base_dir(path: Option<PathBuf>) {
    let service = GlobalState::get::<FileTransferService>();
    *service.receive_base_dir.write().await = path;
}

pub fn set_transfer_event_app_handle(app: AppHandle) {
    let service = GlobalState::get::<FileTransferService>();
    if let Ok(mut guard) = service.event_app_handle.write() {
        *guard = Some(app);
    };
}

fn now_timestamp_ms() -> i64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    match SystemTime::now().duration_since(UNIX_EPOCH) {
        Ok(duration) => duration.as_millis() as i64,
        Err(_) => 0,
    }
}

fn parse_transfer_id(file_id: &str) -> String {
    if let Some((transfer_id, _)) = file_id.split_once(':') {
        transfer_id.to_string()
    } else {
        file_id.to_string()
    }
}

fn emit_transfer_progress(service: &FileTransferService, event: TransferProgressEventPayload) {
    persist_transfer_progress_event(event.clone());

    if let Ok(guard) = service.event_app_handle.read() {
        if let Some(app) = guard.as_ref() {
            let _ = app.emit("transfer-progress", event);
        }
    }
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

    let trimmed = sanitized.trim().trim_matches('.');
    if trimmed.is_empty() {
        "received-file".to_string()
    } else {
        trimmed.to_string()
    }
}

fn duplicate_file_name(file_name: &str, index: usize) -> String {
    let path = std::path::Path::new(file_name);
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
    base_dir: &std::path::Path,
    file_name: &str,
) -> SocketResult<(String, PathBuf, PathBuf)> {
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

    Err(SocketError::other("Could not allocate a unique receive filename").into())
}

fn emit_receive_failure(
    service: &FileTransferService,
    state: &TransferState,
    error_message: String,
) {
    let received_size = state.received_size.load(Ordering::SeqCst);
    let progress_percent = if state.expected_size == 0 {
        0.0
    } else {
        ((received_size as f64 / state.expected_size as f64) * 100.0).min(100.0)
    };

    emit_transfer_progress(
        service,
        TransferProgressEventPayload {
            transfer_id: state.transfer_id.clone(),
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
            sent_bytes: received_size,
            progress_percent,
            status: "failed".to_string(),
            error: Some(error_message),
            timestamp_ms: now_timestamp_ms(),
        },
    );
}

pub fn fail_active_transfers_for_connection(conn_id: &str, reason: &str) {
    let service = GlobalState::get::<FileTransferService>();
    let keys = service
        .active_transfers
        .iter()
        .filter_map(|entry| {
            let key = entry.key();
            if key.0 == conn_id {
                Some(key.clone())
            } else {
                None
            }
        })
        .collect::<Vec<_>>();

    for key in keys {
        if let Some((_, state)) = service.active_transfers.remove(&key) {
            emit_receive_failure(&service, &state, reason.to_string());
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FileMetadata {
    pub id: String,
    pub name: String,
    pub size: u64,
}

async fn handle_file_offer(
    conn: Arc<Connection>,
    payload: Vec<u8>,
    _req_id: i32,
) -> SocketResult<()> {
    let service = GlobalState::get::<FileTransferService>();
    let config = TransferConfig::global();
    let metadata: FileMetadata =
        serde_json::from_slice(&payload).map_err(|e| SocketError::parse(e.to_string()))?;

    if metadata.id.trim().is_empty() {
        return Err(SocketError::parse("File metadata is missing file id").into());
    }
    if metadata.name.trim().is_empty() {
        return Err(SocketError::parse("File metadata is missing file name").into());
    }

    let safe_name = safe_file_name(&metadata.name);
    log::info!("Starting transfer: {} ({})", safe_name, metadata.size);

    let user_dirs = directories::UserDirs::new()
        .ok_or_else(|| SocketError::other("Failed to get user directories"))?;
    let default_download_dir = user_dirs
        .download_dir()
        .ok_or_else(|| SocketError::other("Failed to get download directory"))?;

    let mut base_dir = service
        .receive_base_dir
        .read()
        .await
        .clone()
        .unwrap_or_else(|| default_download_dir.to_path_buf());

    if let Err(e) = tokio::fs::create_dir_all(&base_dir).await {
        log::warn!(
            "Failed to use configured receive directory {:?}: {}. Falling back to Downloads.",
            base_dir,
            e
        );
        base_dir = default_download_dir.to_path_buf();
        tokio::fs::create_dir_all(&base_dir).await.map_err(|err| {
            SocketError::other(format!(
                "Failed to create fallback receive directory {:?}: {}",
                base_dir, err
            ))
        })?;
    }

    let (file_name, final_path, partial_path) =
        resolve_available_receive_paths(&base_dir, &safe_name).await?;
    log::info!("Receive target path: {:?}", final_path);

    let file = File::create(&partial_path).await?;

    if config.preallocate_files && metadata.size > 0 {
        if let Err(e) = file.set_len(metadata.size).await {
            log::warn!("Failed to pre-allocate file: {}", e);
        }
    }

    let writer = BufWriter::with_capacity(config.write_buffer_size, file);
    let conn_id = conn.id().to_string();
    let transfer_id = parse_transfer_id(&metadata.id);

    let state = Arc::new(TransferState {
        writer: Mutex::new(writer),
        final_path: final_path.clone(),
        partial_path,
        file_name: file_name.clone(),
        file_id: metadata.id.clone(),
        transfer_id: transfer_id.clone(),
        expected_size: metadata.size,
        received_size: AtomicU64::new(0),
        last_emitted_size: AtomicU64::new(0),
    });

    service
        .active_transfers
        .insert((conn_id, metadata.id.clone()), state);

    emit_transfer_progress(
        &service,
        TransferProgressEventPayload {
            transfer_id,
            file_id: metadata.id,
            file_path: final_path.to_string_lossy().to_string(),
            file_name,
            direction: "receive".to_string(),
            source_user_id: None,
            source_user_name: None,
            source_device_id: None,
            source_device_name: None,
            same_account: None,
            target_device_id: String::new(),
            total_bytes: metadata.size,
            sent_bytes: 0,
            progress_percent: 0.0,
            status: "processing".to_string(),
            error: None,
            timestamp_ms: now_timestamp_ms(),
        },
    );

    Ok(())
}

async fn handle_file_chunk(
    conn: Arc<Connection>,
    payload: Vec<u8>,
    _req_id: i32,
) -> SocketResult<()> {
    let service = GlobalState::get::<FileTransferService>();

    let mut reader = BinaryReader::new(&payload);
    let file_id = reader
        .read_string()
        .map_err(|e| SocketError::parse(e.to_string()))?;
    let chunk = reader.remaining_bytes();
    let chunk_len = chunk.len() as u64;
    let conn_id = conn.id().to_string();

    let state = {
        service
            .active_transfers
            .get(&(conn_id.clone(), file_id.clone()))
            .map(|r| r.value().clone())
    };

    if let Some(state) = state {
        let current_before = state.received_size.load(Ordering::SeqCst);
        let next_size = current_before
            .checked_add(chunk_len)
            .ok_or_else(|| SocketError::other("Received file size overflowed local counter"))?;
        if next_size > state.expected_size {
            service.active_transfers.remove(&(conn_id, file_id.clone()));
            emit_receive_failure(
                &service,
                &state,
                format!(
                    "Received file exceeded expected size: {} of {} bytes",
                    next_size, state.expected_size
                ),
            );
            return Err(SocketError::other("Received file exceeded expected size").into());
        }

        let mut writer = state.writer.lock().await;
        writer.write_all(chunk).await?;

        let current_size = state.received_size.fetch_add(chunk_len, Ordering::SeqCst) + chunk_len;
        let total_size = state.expected_size;

        let should_emit = current_size == total_size
            || current_size.saturating_sub(state.last_emitted_size.load(Ordering::SeqCst))
                >= RECEIVE_PROGRESS_EMIT_STEP;

        if should_emit {
            state
                .last_emitted_size
                .store(current_size, Ordering::SeqCst);
            let progress_percent = if total_size == 0 {
                100.0
            } else {
                ((current_size as f64 / total_size as f64) * 100.0).min(100.0)
            };
            emit_transfer_progress(
                &service,
                TransferProgressEventPayload {
                    transfer_id: state.transfer_id.clone(),
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
                    total_bytes: total_size,
                    sent_bytes: current_size,
                    progress_percent,
                    status: "processing".to_string(),
                    error: None,
                    timestamp_ms: now_timestamp_ms(),
                },
            );
        }
    } else {
        log::debug!("Received chunk for unknown transfer: {}", file_id);
    }

    Ok(())
}

async fn handle_file_finish(
    conn: Arc<Connection>,
    payload: Vec<u8>,
    _req_id: i32,
) -> SocketResult<()> {
    let service = GlobalState::get::<FileTransferService>();
    let config = TransferConfig::global();
    let mut reader = BinaryReader::new(&payload);
    let file_id = reader
        .read_string()
        .map_err(|e| SocketError::parse(e.to_string()))?;

    let conn_id = conn.id().to_string();

    if let Some((_, state)) = service.active_transfers.remove(&(conn_id, file_id)) {
        let mut writer = state.writer.lock().await;
        writer.flush().await?;

        if config.sync_on_complete {
            writer.get_ref().sync_all().await?;
        }
        let received_size = state.received_size.load(Ordering::SeqCst);
        if received_size != state.expected_size {
            emit_receive_failure(
                &service,
                &state,
                format!(
                    "File ended before expected bytes were written: {} of {} bytes",
                    received_size, state.expected_size
                ),
            );
            return Err(SocketError::other("File ended before expected bytes were written").into());
        }

        let final_path = state.final_path.clone();
        let partial_path = state.partial_path.clone();
        drop(writer);

        tokio::fs::rename(&partial_path, &final_path).await?;
        log::info!("File finished manually: {:?}", final_path);

        emit_transfer_progress(
            &service,
            TransferProgressEventPayload {
                transfer_id: state.transfer_id.clone(),
                file_id: state.file_id.clone(),
                file_path: final_path.to_string_lossy().to_string(),
                file_name: state.file_name.clone(),
                direction: "receive".to_string(),
                source_user_id: None,
                source_user_name: None,
                source_device_id: None,
                source_device_name: None,
                same_account: None,
                target_device_id: String::new(),
                total_bytes: state.expected_size,
                sent_bytes: received_size,
                progress_percent: 100.0,
                status: "success".to_string(),
                error: None,
                timestamp_ms: now_timestamp_ms(),
            },
        );
    }

    Ok(())
}

pub async fn register_file_handlers(router: &PacketRouter) {
    router
        .register(PacketType::FileOffer, |conn, payload, req_id| {
            Box::pin(handle_file_offer(conn, payload, req_id))
        })
        .await;

    router
        .register(PacketType::FileChunk, |conn, payload, req_id| {
            Box::pin(handle_file_chunk(conn, payload, req_id))
        })
        .await;

    router
        .register(PacketType::FileFinish, |conn, payload, req_id| {
            Box::pin(handle_file_finish(conn, payload, req_id))
        })
        .await;
}

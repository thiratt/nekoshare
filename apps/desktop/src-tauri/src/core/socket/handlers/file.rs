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

struct TransferState {
    writer: Mutex<BufWriter<File>>,
    file_path: PathBuf,
    file_name: String,
    file_id: String,
    transfer_id: String,
    expected_size: u64,
    received_size: AtomicU64,
    last_emitted_size: AtomicU64,
}

type TransferMap = DashMap<(String, String), Arc<TransferState>>;

static ACTIVE_TRANSFERS: std::sync::OnceLock<TransferMap> = std::sync::OnceLock::new();
static RECEIVE_BASE_DIR: std::sync::OnceLock<RwLock<Option<PathBuf>>> = std::sync::OnceLock::new();
static EVENT_APP_HANDLE: std::sync::OnceLock<StdRwLock<Option<AppHandle>>> =
    std::sync::OnceLock::new();

const RECEIVE_PROGRESS_EMIT_STEP: u64 = 256 * 1024;

fn get_transfers() -> &'static TransferMap {
    ACTIVE_TRANSFERS.get_or_init(DashMap::new)
}

fn get_receive_base_dir() -> &'static RwLock<Option<PathBuf>> {
    RECEIVE_BASE_DIR.get_or_init(|| RwLock::new(None))
}

pub async fn set_receive_base_dir(path: Option<PathBuf>) {
    *get_receive_base_dir().write().await = path;
}

fn get_event_app_handle() -> &'static StdRwLock<Option<AppHandle>> {
    EVENT_APP_HANDLE.get_or_init(|| StdRwLock::new(None))
}

pub fn set_transfer_event_app_handle(app: AppHandle) {
    if let Ok(mut guard) = get_event_app_handle().write() {
        *guard = Some(app);
    }
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct TransferProgressEvent {
    transfer_id: String,
    file_id: String,
    file_path: String,
    file_name: String,
    direction: &'static str,
    source_user_id: Option<String>,
    source_user_name: Option<String>,
    source_device_id: Option<String>,
    source_device_name: Option<String>,
    same_account: Option<bool>,
    target_device_id: String,
    total_bytes: u64,
    sent_bytes: u64,
    progress_percent: f64,
    status: &'static str,
    error: Option<String>,
    timestamp_ms: i64,
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

fn emit_transfer_progress(event: TransferProgressEvent) {
    if let Ok(guard) = get_event_app_handle().read() {
        if let Some(app) = guard.as_ref() {
            let _ = app.emit("transfer-progress", event);
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
    let config = TransferConfig::global();
    let metadata: FileMetadata =
        serde_json::from_slice(&payload).map_err(|e| SocketError::parse(e.to_string()))?;

    log::info!("Starting transfer: {} ({})", metadata.name, metadata.size);

    let user_dirs = directories::UserDirs::new()
        .ok_or_else(|| SocketError::other("Failed to get user directories"))?;
    let default_download_dir = user_dirs
        .download_dir()
        .ok_or_else(|| SocketError::other("Failed to get download directory"))?;

    let mut base_dir = get_receive_base_dir()
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

    let file_path = base_dir.join(&metadata.name);
    log::info!("Receive target path: {:?}", file_path);

    let file = File::create(&file_path).await?;

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
        file_path: file_path.clone(),
        file_name: metadata.name.clone(),
        file_id: metadata.id.clone(),
        transfer_id: transfer_id.clone(),
        expected_size: metadata.size,
        received_size: AtomicU64::new(0),
        last_emitted_size: AtomicU64::new(0),
    });

    get_transfers().insert((conn_id, metadata.id.clone()), state);

    emit_transfer_progress(TransferProgressEvent {
        transfer_id,
        file_id: metadata.id,
        file_path: file_path.to_string_lossy().to_string(),
        file_name: metadata.name,
        direction: "receive",
        source_user_id: None,
        source_user_name: None,
        source_device_id: None,
        source_device_name: None,
        same_account: None,
        target_device_id: String::new(),
        total_bytes: metadata.size,
        sent_bytes: 0,
        progress_percent: 0.0,
        status: "processing",
        error: None,
        timestamp_ms: now_timestamp_ms(),
    });

    Ok(())
}

async fn handle_file_chunk(
    conn: Arc<Connection>,
    payload: Vec<u8>,
    _req_id: i32,
) -> SocketResult<()> {
    let config = TransferConfig::global();

    let mut reader = BinaryReader::new(&payload);
    let file_id = reader
        .read_string()
        .map_err(|e| SocketError::parse(e.to_string()))?;
    let chunk = reader.remaining_bytes();
    let chunk_len = chunk.len() as u64;
    let conn_id = conn.id().to_string();

    let state = {
        get_transfers()
            .get(&(conn_id.clone(), file_id.clone()))
            .map(|r| r.value().clone())
    };

    if let Some(state) = state {
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
            emit_transfer_progress(TransferProgressEvent {
                transfer_id: state.transfer_id.clone(),
                file_id: state.file_id.clone(),
                file_path: state.file_path.to_string_lossy().to_string(),
                file_name: state.file_name.clone(),
                direction: "receive",
                source_user_id: None,
                source_user_name: None,
                source_device_id: None,
                source_device_name: None,
                same_account: None,
                target_device_id: String::new(),
                total_bytes: total_size,
                sent_bytes: current_size,
                progress_percent,
                status: "processing",
                error: None,
                timestamp_ms: now_timestamp_ms(),
            });
        }

        if current_size >= state.expected_size {
            writer.flush().await?;
            if config.sync_on_complete {
                writer.get_ref().sync_all().await?;
            }

            log::info!("Transfer complete: {:?}", state.file_path);
            emit_transfer_progress(TransferProgressEvent {
                transfer_id: state.transfer_id.clone(),
                file_id: state.file_id.clone(),
                file_path: state.file_path.to_string_lossy().to_string(),
                file_name: state.file_name.clone(),
                direction: "receive",
                source_user_id: None,
                source_user_name: None,
                source_device_id: None,
                source_device_name: None,
                same_account: None,
                target_device_id: String::new(),
                total_bytes: state.expected_size,
                sent_bytes: state.expected_size,
                progress_percent: 100.0,
                status: "success",
                error: None,
                timestamp_ms: now_timestamp_ms(),
            });

            get_transfers().remove(&(conn_id, file_id));
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
    let config = TransferConfig::global();
    let mut reader = BinaryReader::new(&payload);
    let file_id = reader
        .read_string()
        .map_err(|e| SocketError::parse(e.to_string()))?;

    let conn_id = conn.id().to_string();

    if let Some((_, state)) = get_transfers().remove(&(conn_id, file_id)) {
        let mut writer = state.writer.lock().await;
        writer.flush().await?;

        if config.sync_on_complete {
            writer.get_ref().sync_all().await?;
        }
        log::info!("File finished manually: {:?}", state.file_path);

        let received_size = state.received_size.load(Ordering::SeqCst);
        let progress_percent = if state.expected_size == 0 {
            100.0
        } else {
            ((received_size as f64 / state.expected_size as f64) * 100.0).min(100.0)
        };
        emit_transfer_progress(TransferProgressEvent {
            transfer_id: state.transfer_id.clone(),
            file_id: state.file_id.clone(),
            file_path: state.file_path.to_string_lossy().to_string(),
            file_name: state.file_name.clone(),
            direction: "receive",
            source_user_id: None,
            source_user_name: None,
            source_device_id: None,
            source_device_name: None,
            same_account: None,
            target_device_id: String::new(),
            total_bytes: state.expected_size,
            sent_bytes: received_size,
            progress_percent,
            status: "success",
            error: None,
            timestamp_ms: now_timestamp_ms(),
        });
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

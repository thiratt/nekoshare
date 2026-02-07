use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};
use tauri_plugin_store::StoreExt;
use thiserror::Error;
use tokio::{fs::File, io::AsyncReadExt};
use uuid::Uuid;

use crate::{
    core::{
        device::DeviceManager,
        socket::{
            handlers::file::{set_receive_base_dir, set_transfer_event_app_handle},
            ids::{LinkKey, RouteKind},
            Connection, PacketType, SocketClientConfig, SocketManager, TransferConfig,
        },
    },
    state::GlobalState,
};

const STORE_FILE_NAME: &str = "nekoshare.json";

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

const SEND_PROGRESS_EMIT_STEP: u64 = 256 * 1024;

#[derive(serde::Serialize)]
struct FileMetadata {
    id: String,
    name: String,
    size: u64,
}

#[derive(Clone)]
struct SendTransferContext {
    app_handle: AppHandle,
    transfer_id: String,
    source_user_id: Option<String>,
    source_user_name: Option<String>,
    source_device_id: String,
    source_device_name: Option<String>,
    target_device_id: String,
}

impl SendTransferContext {
    fn emit_event(&self, event: TransferProgressEvent) {
        let _ = self.app_handle.emit("transfer-progress", event);
    }

    fn emit_started(&self, file_id: &str, file_path: &str, file_name: &str, total_bytes: u64) {
        self.emit_event(TransferProgressEvent {
            transfer_id: self.transfer_id.clone(),
            file_id: file_id.to_string(),
            file_path: file_path.to_string(),
            file_name: file_name.to_string(),
            direction: "send",
            source_user_id: self.source_user_id.clone(),
            source_user_name: self.source_user_name.clone(),
            source_device_id: Some(self.source_device_id.clone()),
            source_device_name: self.source_device_name.clone(),
            same_account: Some(true),
            target_device_id: self.target_device_id.clone(),
            total_bytes,
            sent_bytes: 0,
            progress_percent: 0.0,
            status: "processing",
            error: None,
            timestamp_ms: now_timestamp_ms(),
        });
    }

    fn emit_processing(
        &self,
        file_id: &str,
        file_path: &str,
        file_name: &str,
        total_bytes: u64,
        sent_bytes: u64,
    ) {
        let progress_percent = if total_bytes == 0 {
            100.0
        } else {
            ((sent_bytes as f64 / total_bytes as f64) * 100.0).min(100.0)
        };

        self.emit_event(TransferProgressEvent {
            transfer_id: self.transfer_id.clone(),
            file_id: file_id.to_string(),
            file_path: file_path.to_string(),
            file_name: file_name.to_string(),
            direction: "send",
            source_user_id: self.source_user_id.clone(),
            source_user_name: self.source_user_name.clone(),
            source_device_id: Some(self.source_device_id.clone()),
            source_device_name: self.source_device_name.clone(),
            same_account: Some(true),
            target_device_id: self.target_device_id.clone(),
            total_bytes,
            sent_bytes,
            progress_percent,
            status: "processing",
            error: None,
            timestamp_ms: now_timestamp_ms(),
        });
    }

    fn emit_completed(&self, file_id: &str, file_path: &str, file_name: &str, total_bytes: u64) {
        self.emit_event(TransferProgressEvent {
            transfer_id: self.transfer_id.clone(),
            file_id: file_id.to_string(),
            file_path: file_path.to_string(),
            file_name: file_name.to_string(),
            direction: "send",
            source_user_id: self.source_user_id.clone(),
            source_user_name: self.source_user_name.clone(),
            source_device_id: Some(self.source_device_id.clone()),
            source_device_name: self.source_device_name.clone(),
            same_account: Some(true),
            target_device_id: self.target_device_id.clone(),
            total_bytes,
            sent_bytes: total_bytes,
            progress_percent: 100.0,
            status: "success",
            error: None,
            timestamp_ms: now_timestamp_ms(),
        });
    }

    fn emit_batch_failed(&self, error_message: String) {
        self.emit_event(TransferProgressEvent {
            transfer_id: self.transfer_id.clone(),
            file_id: String::new(),
            file_path: String::new(),
            file_name: String::new(),
            direction: "send",
            source_user_id: self.source_user_id.clone(),
            source_user_name: self.source_user_name.clone(),
            source_device_id: Some(self.source_device_id.clone()),
            source_device_name: self.source_device_name.clone(),
            same_account: Some(true),
            target_device_id: self.target_device_id.clone(),
            total_bytes: 0,
            sent_bytes: 0,
            progress_percent: 0.0,
            status: "failed",
            error: Some(error_message),
            timestamp_ms: now_timestamp_ms(),
        });
    }
}

fn map_transfer_error(stage: &str, err: impl std::fmt::Display) -> SocketCommandError {
    SocketCommandError::ConnectionFailed(format!("{}: {}", stage, err))
}

fn file_name_from_path(path: &Path) -> String {
    path.file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string()
}

async fn send_file_offer(
    connection: &Arc<Connection>,
    file_id: &str,
    file_name: &str,
    total_size: u64,
) -> Result<(), SocketCommandError> {
    let header = FileMetadata {
        id: file_id.to_string(),
        name: file_name.to_string(),
        size: total_size,
    };

    let header_bytes = serde_json::to_vec(&header).map_err(|e| map_transfer_error("Serialize header error", e))?;

    connection
        .send_packet(PacketType::FileOffer, |w| {
            w.reserve(header_bytes.len());
            w.write_bytes(&header_bytes);
        })
        .await
        .map_err(|e| map_transfer_error("Send header error", e))?;

    Ok(())
}

async fn transfer_single_file(
    connection: &Arc<Connection>,
    context: &SendTransferContext,
    path_str: &str,
    buffer: &mut [u8],
    total_bytes_sent: &mut u64,
) -> Result<(), SocketCommandError> {
    let file_id = format!("{}:{}", context.transfer_id, Uuid::new_v4());
    let path = Path::new(path_str);
    let file_name = file_name_from_path(path);

    let mut file = File::open(path)
        .await
        .map_err(|e| map_transfer_error("Open error", e))?;
    let metadata = file
        .metadata()
        .await
        .map_err(|e| map_transfer_error("Metadata error", e))?;

    let total_size = metadata.len();
    let mut last_progress_emitted: u64 = 0;
    let mut file_sent_bytes: u64 = 0;

    context.emit_started(&file_id, path_str, &file_name, total_size);

    send_file_offer(connection, &file_id, &file_name, total_size).await?;

    log::info!("Sent offer for {} (id: {})", file_name, file_id);
    log::info!(
        "Starting chunk transfer for {} (size: {} bytes, id: {})",
        file_name,
        total_size,
        file_id
    );

    loop {
        let n = file
            .read(buffer)
            .await
            .map_err(|e| map_transfer_error("Read error", e))?;

        if n == 0 {
            log::info!("EOF reached for {}", file_name);
            break;
        }

        connection
            .send_packet(PacketType::FileChunk, |w| {
                w.write_string(&file_id);
                w.write_bytes(&buffer[..n]);
            })
            .await
            .map_err(|e| map_transfer_error("Send chunk error", e))?;

        *total_bytes_sent += n as u64;
        file_sent_bytes += n as u64;

        let sent_bytes = file_sent_bytes.min(total_size);
        let should_emit = sent_bytes == total_size
            || sent_bytes.saturating_sub(last_progress_emitted) >= SEND_PROGRESS_EMIT_STEP;

        if should_emit {
            last_progress_emitted = sent_bytes;
            context.emit_processing(&file_id, path_str, &file_name, total_size, sent_bytes);
        }
    }

    log::info!("Sending FileFinish for {}", file_name);
    connection
        .send_packet(PacketType::FileFinish, |w| {
            w.write_string(&file_id);
        })
        .await
        .map_err(|e| map_transfer_error("Send finish error", e))?;

    log::info!("File transfer complete for {} (id: {})", file_name, file_id);
    context.emit_completed(&file_id, path_str, &file_name, total_size);

    Ok(())
}

async fn send_files_batch(
    connection: Arc<Connection>,
    context: SendTransferContext,
    file_paths: Vec<String>,
    chunk_size: usize,
) -> Result<u64, SocketCommandError> {
    let mut total_bytes: u64 = 0;
    let mut buffer = vec![0u8; chunk_size];

    for path_str in file_paths {
        transfer_single_file(
            &connection,
            &context,
            &path_str,
            &mut buffer,
            &mut total_bytes,
        )
        .await?;
    }

    Ok(total_bytes)
}

#[derive(Debug, Error, Serialize, Deserialize)]
pub enum SocketCommandError {
    #[error("Invalid UUID format for {field}: {value}")]
    InvalidUuid { field: &'static str, value: String },

    #[error("Invalid route type: {0}. Must be 'direct' or 'relay'")]
    InvalidRouteType(String),

    #[error("Connection failed: {0}")]
    ConnectionFailed(String),

    #[error("Server error: {0}")]
    ServerError(String),
}

#[derive(serde::Serialize, Clone)]
pub enum ConnectionStatus {
    Connected,
    Disconnected,
}

#[derive(serde::Serialize)]
pub struct ClientConnectionResponse {
    pub status: ConnectionStatus,
    pub message: Option<String>,
}

#[derive(serde::Serialize)]
pub struct ServerStartResponse {
    pub port: u16,
    pub address: String,
    pub message: String,
}

#[inline]
fn parse_uuid(value: &str, field: &'static str) -> Result<uuid::Uuid, SocketCommandError> {
    uuid::Uuid::parse_str(value).map_err(|_| SocketCommandError::InvalidUuid {
        field,
        value: value.to_string(),
    })
}

#[inline]
fn parse_route_kind(route: &str) -> Result<RouteKind, SocketCommandError> {
    match route {
        "direct" => Ok(RouteKind::Direct),
        "relay" => Ok(RouteKind::Relay),
        _ => Err(SocketCommandError::InvalidRouteType(route.to_string())),
    }
}

async fn load_receive_dir_from_store(app: &AppHandle) -> Option<PathBuf> {
    let resolved = tauri_plugin_store::resolve_store_path(app, STORE_FILE_NAME).ok();
    if let Some(path) = resolved {
        log::info!("Reading receive path from store: {:?}", path);
    }

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

    let raw_app_config = match store.get("appConfig") {
        Some(value) => value,
        None => {
            log::info!("Store key appConfig not found in {}", STORE_FILE_NAME);
            return None;
        }
    };

    let file_location = raw_app_config
        .get("fileLocation")
        .and_then(JsonValue::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty());

    match file_location {
        Some(path) => Some(PathBuf::from(path)),
        None => {
            log::info!("Store appConfig.fileLocation is empty");
            None
        }
    }
}

// =============================================================================
// Connection Commands (Unified)
// =============================================================================

#[tauri::command]
pub async fn socket_client_connect_to(
    state: State<'_, Arc<SocketManager>>,
    device_id: String,
    receiver_id: String,
    receiver_address: String,
    receiver_port: u16,
    receiver_fingerprint: String,
) -> Result<ClientConnectionResponse, SocketCommandError> {
    let manager = state.inner().clone();

    let address = format!("{}:{}", receiver_address, receiver_port);

    let config = SocketClientConfig::new(device_id, address)
        .with_fingerprint(receiver_fingerprint)
        .with_target_id(receiver_id);

    let connection = manager
        .get_or_connect(config)
        .await
        .map_err(|e| SocketCommandError::ConnectionFailed(format!("{:#}", e)))?;

    Ok(ClientConnectionResponse {
        status: ConnectionStatus::Connected,
        message: Some(format!("Connected via session {}", connection.id())),
    })
}

#[tauri::command]
pub async fn socket_client_disconnect_from(
    state: State<'_, Arc<SocketManager>>,
    device_id: String,
    target_id: String,
    route: String,
) -> Result<ClientConnectionResponse, SocketCommandError> {
    let manager = state.inner().clone();

    let local = parse_uuid(&device_id, "device_id")?;
    let peer = parse_uuid(&target_id, "target_id")?;

    let route_kind = parse_route_kind(&route)?;
    let pair_key = LinkKey::new(local, peer, route_kind).pair_key();

    let _ = manager.disconnect(&pair_key).await;

    Ok(ClientConnectionResponse {
        status: ConnectionStatus::Disconnected,
        message: Some("Disconnected".to_string()),
    })
}

#[tauri::command]
pub async fn socket_client_is_connected(
    state: State<'_, Arc<SocketManager>>,
    device_id: String,
    target_id: String,
    route: String,
) -> Result<ClientConnectionResponse, SocketCommandError> {
    let manager = state.inner().clone();

    let local = parse_uuid(&device_id, "device_id")?;
    let peer = parse_uuid(&target_id, "target_id")?;
    let route_kind = parse_route_kind(&route)?;

    let pair_key = LinkKey::new(local, peer, route_kind).pair_key();

    let status = if manager.get_connection(&pair_key).is_some() {
        ConnectionStatus::Connected
    } else {
        ConnectionStatus::Disconnected
    };

    Ok(ClientConnectionResponse {
        status,
        message: None,
    })
}

#[tauri::command]
pub async fn socket_client_send_files(
    state: State<'_, Arc<SocketManager>>,
    app: AppHandle,
    device_id: String,
    target_id: String,
    file_paths: Vec<String>,
    transfer_id: Option<String>,
    source_user_id: Option<String>,
    source_user_name: Option<String>,
    source_device_name: Option<String>,
) -> Result<ClientConnectionResponse, SocketCommandError> {
    let chunk_size = TransferConfig::global().chunk_size;

    let manager = state.inner().clone();

    let local = parse_uuid(&device_id, "device_id")?;
    let peer = parse_uuid(&target_id, "target_id")?;

    let pair_key = LinkKey::direct(local, peer).pair_key();

    let connection = manager
        .get_connection(&pair_key)
        .ok_or_else(|| SocketCommandError::ConnectionFailed("Not connected to target".into()))?;

    log::info!(
        "Starting transfer {} files to {}",
        file_paths.len(),
        target_id
    );

    let queued_count = file_paths.len();
    let context = SendTransferContext {
        app_handle: app.clone(),
        transfer_id: transfer_id.unwrap_or_else(|| Uuid::new_v4().to_string()),
        source_user_id,
        source_user_name,
        source_device_id: device_id.clone(),
        source_device_name,
        target_device_id: target_id.clone(),
    };
    let connection = connection.clone();
    let file_paths = file_paths.clone();

    tokio::spawn(async move {
        connection.begin_send_batch();
        let result =
            send_files_batch(connection.clone(), context.clone(), file_paths, chunk_size).await;

        connection.end_send_batch_and_maybe_close().await;

        match result {
            Ok(total_bytes) => {
                log::info!("Batch completed, sent {} bytes", total_bytes);
            }
            Err(err) => {
                log::error!("Send batch failed: {}", err);
                context.emit_batch_failed(err.to_string());
            }
        }
    });

    Ok(ClientConnectionResponse {
        status: ConnectionStatus::Connected,
        message: Some(format!("Queued {} files", queued_count)),
    })
}

// =============================================================================
// Server Commands
// =============================================================================

#[tauri::command]
pub async fn socket_server_start(
    state: State<'_, Arc<SocketManager>>,
    app: AppHandle,
    sender_fingerprint: String,
) -> Result<ServerStartResponse, SocketCommandError> {
    let manager = state.inner().clone();

    set_transfer_event_app_handle(app.clone());

    let receive_dir = load_receive_dir_from_store(&app).await;
    set_receive_base_dir(receive_dir.clone()).await;

    if let Some(path) = receive_dir {
        log::info!("Using configured receive directory from store: {:?}", path);
    } else {
        log::info!("No configured receive directory found. Using Downloads fallback.");
    }

    let device_manager = GlobalState::get::<DeviceManager>();
    let ip = device_manager
        .info()
        .map_err(|e| {
            SocketCommandError::ServerError(format!("Failed to get device info: {:#}", e))
        })?
        .device_info
        .ip;

    let port = manager
        .start_server(sender_fingerprint)
        .await
        .map_err(|e| SocketCommandError::ServerError(format!("{:#}", e)))?;

    Ok(ServerStartResponse {
        port,
        address: ip.ipv4,
        message: format!("Server listening on port {}", port),
    })
}

#[tauri::command]
pub async fn socket_server_stop(
    state: State<'_, Arc<SocketManager>>,
) -> Result<String, SocketCommandError> {
    let _manager = state.inner().clone();

    todo!()
}

#[tauri::command]
pub async fn socket_server_has_active_connection(
    state: State<'_, Arc<SocketManager>>,
) -> Result<bool, SocketCommandError> {
    let manager = state.inner().clone();

    Ok(manager.has_active_server_connection())
}

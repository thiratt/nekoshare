use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use std::path::PathBuf;
use std::sync::Arc;
use tauri::{AppHandle, State};
use tauri_plugin_store::StoreExt;
use thiserror::Error;
use tokio::{fs::File, io::AsyncReadExt, sync::Mutex};
use uuid::Uuid;

use crate::{
    core::{
        device::DeviceManager,
        socket::{
            handlers::file::set_receive_base_dir,
            ids::{LinkKey, RouteKind},
            ConnectionServerConfig, PacketType, SocketClientConfig, SocketManager, TransferConfig,
        },
    },
    state::GlobalState,
};

const STORE_FILE_NAME: &str = "nekoshare.json";

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

pub struct SocketState {
    pub manager: Arc<SocketManager>,
}

impl SocketState {
    pub fn new(manager: Arc<SocketManager>) -> Self {
        Self { manager }
    }
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
    state: State<'_, Mutex<SocketState>>,
    device_id: String,
    receiver_id: String,
    receiver_address: String,
    receiver_port: u16,
    receiver_fingerprint: String,
) -> Result<ClientConnectionResponse, SocketCommandError> {
    let manager = {
        let state_guard = state.lock().await;
        state_guard.manager.clone()
    };

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
    state: State<'_, Mutex<SocketState>>,
    device_id: String,
    target_id: String,
    route: String,
) -> Result<ClientConnectionResponse, SocketCommandError> {
    let manager = {
        let state_guard = state.lock().await;
        state_guard.manager.clone()
    };

    let local = parse_uuid(&device_id, "device_id")?;
    let peer = parse_uuid(&target_id, "target_id")?;

    let route_kind = parse_route_kind(&route)?;
    let pair_key = LinkKey::new(local, peer, route_kind).pair_key();

    let _ = manager.disconnect(&pair_key);

    Ok(ClientConnectionResponse {
        status: ConnectionStatus::Disconnected,
        message: Some("Disconnected".to_string()),
    })
}

#[tauri::command]
pub async fn socket_client_is_connected(
    state: State<'_, Mutex<SocketState>>,
    device_id: String,
    target_id: String,
    route: String,
) -> Result<ClientConnectionResponse, SocketCommandError> {
    let manager = {
        let state_guard = state.lock().await;
        state_guard.manager.clone()
    };

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
    state: State<'_, Mutex<SocketState>>,
    device_id: String,
    target_id: String,
    file_paths: Vec<String>,
) -> Result<ClientConnectionResponse, SocketCommandError> {
    let config = TransferConfig::global();
    let chunk_size = config.chunk_size;

    let manager = {
        let state_guard = state.lock().await;
        state_guard.manager.clone()
    };

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

    #[derive(serde::Serialize)]
    struct FileMetadata {
        id: String,
        name: String,
        size: u64,
    }

    let queued_count = file_paths.len();
    let connection = connection.clone();
    let file_paths = file_paths.clone();

    tokio::spawn(async move {
        let mut total_bytes: u64 = 0;
        let mut buffer = vec![0u8; chunk_size];

        connection.begin_send_batch();
        let result = async {
            for path_str in file_paths {
                let file_id = Uuid::new_v4().to_string();

                let path = std::path::Path::new(&path_str);
                let file_name = path
                    .file_name()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .to_string();

                let mut file = File::open(path).await.map_err(|e| {
                    SocketCommandError::ConnectionFailed(format!("Open error: {}", e))
                })?;

                let metadata = file.metadata().await.map_err(|e| {
                    SocketCommandError::ConnectionFailed(format!("Metadata error: {}", e))
                })?;

                let header = FileMetadata {
                    id: file_id.clone(),
                    name: file_name.clone(),
                    size: metadata.len(),
                };
                let header_bytes = serde_json::to_vec(&header).unwrap();

                connection
                    .send_packet(PacketType::FileOffer, |w| {
                        w.reserve(header_bytes.len());
                        w.write_bytes(&header_bytes);
                    })
                    .await
                    .map_err(|e| {
                        SocketCommandError::ConnectionFailed(format!("Send header error: {}", e))
                    })?;

                log::info!("Sent offer for {} (id: {})", file_name, file_id);

                log::info!(
                    "Starting chunk transfer for {} (size: {} bytes, id: {})",
                    file_name,
                    metadata.len(),
                    file_id
                );
                loop {
                    let n = file.read(&mut buffer).await.map_err(|e| {
                        SocketCommandError::ConnectionFailed(format!("Read error: {}", e))
                    })?;

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
                        .map_err(|e| {
                            SocketCommandError::ConnectionFailed(format!("Send chunk error: {}", e))
                        })?;

                    total_bytes += n as u64;
                }

                log::info!("Sending FileFinish for {}", file_name);
                connection
                    .send_packet(PacketType::FileFinish, |w| {
                        w.write_string(&file_id);
                    })
                    .await
                    .map_err(|e| {
                        SocketCommandError::ConnectionFailed(format!("Send finish error: {}", e))
                    })?;

                log::info!("File transfer complete for {} (id: {})", file_name, file_id);
            }

            Ok::<(), SocketCommandError>(())
        }
        .await;

        connection.end_send_batch_and_maybe_close().await;

        if let Err(err) = result {
            log::error!("Send batch failed: {}", err);
        } else {
            log::info!("Batch completed, sent {} bytes", total_bytes);
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
    state: State<'_, Mutex<SocketState>>,
    app: AppHandle,
    sender_fingerprint: String,
) -> Result<ServerStartResponse, SocketCommandError> {
    let manager = {
        let state_guard = state.lock().await;
        state_guard.manager.clone()
    };

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

    let config = ConnectionServerConfig::default();

    let port = manager
        .start_server(config, sender_fingerprint)
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
    state: State<'_, Mutex<SocketState>>,
) -> Result<String, SocketCommandError> {
    let _manager = {
        let state_guard = state.lock().await;
        state_guard.manager.clone()
    };

    todo!()
}

#[tauri::command]
pub async fn socket_server_has_active_connection(
    state: State<'_, Mutex<SocketState>>,
) -> Result<bool, SocketCommandError> {
    let manager = {
        let state_guard = state.lock().await;
        state_guard.manager.clone()
    };

    Ok(manager.has_active_server_connection())
}

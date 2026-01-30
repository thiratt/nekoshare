use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex;
use serde::{Deserialize, Serialize};
use thiserror::Error;

use crate::core::socket::{
    manager::SocketClientManager, LinkKey, RouteKind, SocketClientConfig, SocketServerManager,
};

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
    client_manager: Arc<SocketClientManager>,
    server_manager: Arc<SocketServerManager>,
}

impl SocketState {
    pub fn new() -> Self {
        Self {
            client_manager: Arc::new(SocketClientManager::new()),
            server_manager: Arc::new(SocketServerManager::new()),
        }
    }
}

impl Default for SocketState {
    fn default() -> Self {
        Self::new()
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

// =============================================================================
// Client Commands
// =============================================================================

#[tauri::command]
pub async fn socket_client_connect(
    state: State<'_, Mutex<SocketState>>,
    device_id: String,
    token: String,
) -> Result<ClientConnectionResponse, SocketCommandError> {
    let client_manager = {
        let socket_state = state.lock().await;
        Arc::clone(&socket_state.client_manager)
    };

    let client = client_manager
        .connect(device_id, token)
        .await
        .map_err(|e| SocketCommandError::ConnectionFailed(format!("{:#}", e)))?;

    let is_connected = client.is_connected().await;
    let is_authenticated = client.is_authenticated().await;

    let (status, message) = match (is_connected, is_authenticated) {
        (true, true) => (ConnectionStatus::Connected, "Connected and authenticated"),
        (true, false) => (ConnectionStatus::Disconnected, "Connected but not authenticated"),
        _ => (ConnectionStatus::Disconnected, "Disconnected"),
    };

    Ok(ClientConnectionResponse {
        status,
        message: Some(message.to_string()),
    })
}

#[tauri::command]
pub async fn socket_client_connect_to(
    state: State<'_, Mutex<SocketState>>,
    device_id: String,
    target_id: String,
    target_address: String,
    fingerprint: String,
) -> Result<ClientConnectionResponse, SocketCommandError> {
    let client_manager = {
        let socket_state = state.lock().await;
        Arc::clone(&socket_state.client_manager)
    };

    let config = SocketClientConfig::new(device_id, target_address.clone())
        .with_fingerprint(fingerprint)
        .with_target_id(target_id);

    client_manager
        .connect_to(config)
        .await
        .map_err(|e| SocketCommandError::ConnectionFailed(format!("{} - {:#}", target_address, e)))?;

    Ok(ClientConnectionResponse {
        status: ConnectionStatus::Connected,
        message: Some(format!("Connected to {}", target_address)),
    })
}

#[tauri::command]
pub async fn socket_client_disconnect_from(
    state: State<'_, Mutex<SocketState>>,
    device_id: String,
    target_id: String,
    route: String,
) -> Result<ClientConnectionResponse, SocketCommandError> {
    let client_manager = {
        let socket_state = state.lock().await;
        Arc::clone(&socket_state.client_manager)
    };

    let local = parse_uuid(&device_id, "device_id")?;
    let peer = parse_uuid(&target_id, "target_id")?;
    let route_kind = parse_route_kind(&route)?;

    let link = LinkKey::new(local, peer, route_kind);
    client_manager.disconnect(link).await;

    Ok(ClientConnectionResponse {
        status: ConnectionStatus::Disconnected,
        message: Some("Disconnected".to_string()),
    })
}

#[tauri::command]
pub async fn socket_client_disconnect_from_server(
    state: State<'_, Mutex<SocketState>>,
) -> Result<ClientConnectionResponse, SocketCommandError> {
    let client_manager = {
        let socket_state = state.lock().await;
        Arc::clone(&socket_state.client_manager)
    };

    client_manager.disconnect_from_server().await;

    Ok(ClientConnectionResponse {
        status: ConnectionStatus::Disconnected,
        message: Some("Disconnected from server".to_string()),
    })
}

#[tauri::command]
pub async fn socket_client_is_connected(
    state: State<'_, Mutex<SocketState>>,
    device_id: String,
    target_id: String,
    route: String,
) -> Result<ClientConnectionResponse, SocketCommandError> {
    let client_manager = {
        let socket_state = state.lock().await;
        Arc::clone(&socket_state.client_manager)
    };

    let local = parse_uuid(&device_id, "device_id")?;
    let peer = parse_uuid(&target_id, "target_id")?;
    let route_kind = parse_route_kind(&route)?;

    let link = LinkKey::new(local, peer, route_kind);

    let status = match client_manager.get_client(link).await {
        Some(client) if client.is_connected().await => ConnectionStatus::Connected,
        _ => ConnectionStatus::Disconnected,
    };

    Ok(ClientConnectionResponse {
        status,
        message: None,
    })
}

#[tauri::command]
pub async fn socket_client_is_connected_to_server(
    state: State<'_, Mutex<SocketState>>,
) -> Result<ClientConnectionResponse, SocketCommandError> {
    let client_manager = {
        let socket_state = state.lock().await;
        Arc::clone(&socket_state.client_manager)
    };

    let status = if client_manager.is_connected_to_server().await {
        ConnectionStatus::Connected
    } else {
        ConnectionStatus::Disconnected
    };

    Ok(ClientConnectionResponse {
        status,
        message: None,
    })
}

// =============================================================================
// Server Commands
// =============================================================================

#[tauri::command]
pub async fn socket_server_start(
    state: State<'_, Mutex<SocketState>>,
    id: String,
    fingerprint: String,
) -> Result<ServerStartResponse, SocketCommandError> {
    let socket_state = state.lock().await;
    let server_manager = &socket_state.server_manager;

    let port = server_manager
        .create_server(id, fingerprint)
        .await
        .map_err(|e| SocketCommandError::ServerError(format!("{:#}", e)))?;

    Ok(ServerStartResponse {
        port,
        address: String::new(),
        message: format!("Server started on port {}", port),
    })
}

#[tauri::command]
pub async fn socket_server_stop(
    state: State<'_, Mutex<SocketState>>,
    id: String,
) -> Result<String, SocketCommandError> {
    let socket_state = state.lock().await;
    let server_manager = &socket_state.server_manager;

    server_manager.stop_server(&id).await;

    Ok("Server stopped".to_string())
}

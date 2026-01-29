use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex;

use crate::core::socket::{
    manager::SocketClientManager, LinkKey, RouteKind, SocketClientConfig, SocketServerManager,
};

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

// =============================================================================
// Client Commands
// =============================================================================

#[tauri::command]
pub async fn socket_client_connect(
    state: State<'_, Mutex<SocketState>>,
    device_id: String,
    token: String,
) -> Result<ClientConnectionResponse, String> {
    let client_manager = {
        let socket_state = state.lock().await;
        socket_state.client_manager.clone()
    };

    let client = client_manager
        .connect(device_id, token)
        .await
        .map_err(|e| format!("Connection failed: {:#}", e))?;

    let is_connected = client.is_connected().await;
    let is_authenticated = client.is_authenticated().await;
    let message = if is_connected && is_authenticated {
        Some("Connected and authenticated".to_string())
    } else if is_connected {
        Some("Connected but not authenticated".to_string())
    } else {
        Some("Disconnected".to_string())
    };

    Ok(ClientConnectionResponse {
        status: if is_connected && is_authenticated {
            ConnectionStatus::Connected
        } else {
            ConnectionStatus::Disconnected
        },
        message,
    })
}

#[tauri::command]
pub async fn socket_client_connect_to(
    state: State<'_, Mutex<SocketState>>,
    device_id: String,
    target_id: String,
    target_address: String,
    fingerprint: String,
) -> Result<ClientConnectionResponse, String> {
    let client_manager = {
        let socket_state = state.lock().await;
        socket_state.client_manager.clone()
    };

    let config = SocketClientConfig::new(device_id, target_address.clone())
        .with_fingerprint(fingerprint)
        .with_target_id(target_id);

    client_manager
        .connect_to(config)
        .await
        .map_err(|e| format!("Connection to {} failed: {:#}", target_address, e))?;

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
) -> Result<ClientConnectionResponse, String> {
    let client_manager = {
        let socket_state = state.lock().await;
        socket_state.client_manager.clone()
    };

    let local =
        uuid::Uuid::parse_str(&device_id).map_err(|_| "device_id must be UUID".to_string())?;
    let peer =
        uuid::Uuid::parse_str(&target_id).map_err(|_| "target_id must be UUID".to_string())?;

    let route_kind = match route.as_str() {
        "direct" => RouteKind::Direct,
        "relay" => RouteKind::Relay,
        _ => return Err("route must be 'direct' or 'relay'".to_string()),
    };

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
) -> Result<ClientConnectionResponse, String> {
    let client_manager = {
        let socket_state = state.lock().await;
        socket_state.client_manager.clone()
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
) -> Result<ClientConnectionResponse, String> {
    let client_manager = {
        let socket_state = state.lock().await;
        socket_state.client_manager.clone()
    };

    let local =
        uuid::Uuid::parse_str(&device_id).map_err(|_| "device_id must be UUID".to_string())?;
    let peer =
        uuid::Uuid::parse_str(&target_id).map_err(|_| "target_id must be UUID".to_string())?;

    let route_kind = match route.as_str() {
        "direct" => RouteKind::Direct,
        "relay" => RouteKind::Relay,
        _ => return Err("route must be 'direct' or 'relay'".to_string()),
    };

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
) -> Result<ClientConnectionResponse, String> {
    let client_manager = {
        let socket_state = state.lock().await;
        socket_state.client_manager.clone()
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
) -> Result<ServerStartResponse, String> {
    let socket_state = state.lock().await;
    let server_manager = &socket_state.server_manager;

    let port = server_manager
        .create_server(id, fingerprint)
        .await
        .map_err(|e| format!("Failed to start server: {:#}", e))?;

    let response = ServerStartResponse {
        port: port,
        address: "".to_string(),
        message: format!("Server started on port {}", port),
    };

    Ok(response)
}

#[tauri::command]
pub async fn socket_server_stop(
    state: State<'_, Mutex<SocketState>>,
    id: String,
) -> Result<String, String> {
    let socket_state = state.lock().await;
    let server_manager = &socket_state.server_manager;

    server_manager.stop_server(&id).await;

    Ok("Server stopped".to_string())
}

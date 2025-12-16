use tauri::State;
use tokio::sync::Mutex;

use crate::core::socket::NekoSocket;

#[derive(serde::Serialize)]
pub enum SocketStatus {
    Connected,
    Disconnected,   
}

#[derive(serde::Serialize)]
pub struct SocketResponse {
    status: SocketStatus,
}

#[tauri::command]
pub async fn connect_socket(state: State<'_, Mutex<NekoSocket>>, addr: String) -> Result<(), String> {
    let mut socket = state.lock().await;
    socket.connect(addr).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn disconnect_socket(state: State<'_, Mutex<NekoSocket>>) -> Result<(), String> {
    let mut socket = state.lock().await;
    socket.disconnect().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn send_socket_data(state: State<'_, Mutex<NekoSocket>>, data: &[u8]) -> Result<(), String> {
    let mut socket = state.lock().await;
    socket.send_data(&data).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn is_socket_connected(state: State<'_, Mutex<NekoSocket>>) -> Result<SocketResponse, String> {
    let socket = state.lock().await;

    let status = if socket.is_connected() {
        SocketStatus::Connected
    } else {
        SocketStatus::Disconnected
    };

    Ok(SocketResponse { status })
}
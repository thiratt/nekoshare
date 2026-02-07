use tokio::sync::mpsc;

use tauri::{App, Emitter, Manager};
use tokio::sync::Mutex;

use state::GlobalState;

mod commands;
mod config;
mod core;
mod state;

use commands::socket::SocketState;
use core::socket::{ConnectionEvent, SocketManager};

use crate::core::device::DeviceManager;
use crate::core::socket::handlers::file::FileTransferService;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_fs::init())
        .setup(setup_app)
        .invoke_handler(tauri::generate_handler![
            // Device
            commands::device::ns_get_device_info,
            commands::device::ns_get_device_info_with_key,
            commands::device::ns_get_key,
            // File System
            commands::file::read_files_in_dir,
            commands::file::read_files_ready_to_use,
            commands::file::delete_file,
            // Search
            commands::search::search_items,
            commands::search::search_items_paginated,
            // Socket Client
            commands::socket::socket_client_connect_to,
            commands::socket::socket_client_disconnect_from,
            commands::socket::socket_client_is_connected,
            commands::socket::socket_client_send_files,
            // Socket Server
            commands::socket::socket_server_start,
            commands::socket::socket_server_stop,
            commands::socket::socket_server_has_active_connection,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn setup_app(app: &mut App) -> Result<(), Box<dyn std::error::Error>> {
    GlobalState::new()
        .register(DeviceManager::new().expect("Failed to initialize DeviceManager"))
        .register(FileTransferService::new())
        .init();

    let (event_tx, mut event_rx) = mpsc::channel::<ConnectionEvent>(256);
    let manager = SocketManager::new(event_tx);

    app.manage(Mutex::new(SocketState::new(manager)));

    let app_handle = app.handle().clone();
    tauri::async_runtime::spawn(async move {
        while let Some(event) = event_rx.recv().await {
            match event {
                ConnectionEvent::Connected { id, address } => {
                    let _ = app_handle.emit(
                        "socket-connected",
                        serde_json::json!({ "id": id, "address": address }),
                    );
                }
                ConnectionEvent::Disconnected { id, .. } => {
                    let _ = app_handle.emit("socket-disconnected", serde_json::json!({ "id": id }));
                }
                _ => {}
            }
        }
    });

    init_logging(app)?;

    Ok(())
}

fn init_logging(app: &mut App) -> Result<(), Box<dyn std::error::Error>> {
    if cfg!(debug_assertions) {
        app.handle().plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Info)
                .build(),
        )?;
    }
    Ok(())
}

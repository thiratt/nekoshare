use tauri::Manager;
use tokio::sync::Mutex;

mod commands;
mod config;
mod core;
mod state;

use commands::socket::SocketState;

use crate::{core::device::DeviceManager, state::GlobalState};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            GlobalState::new()
            .register(DeviceManager::new())
            .init();

            app.manage(Mutex::new(SocketState::new()));
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Device commands
            commands::device::ns_get_device_info,
            commands::device::ns_get_device_info_with_key,
            commands::device::ns_get_key,
            // file commands
            commands::file::read_files_in_dir,
            commands::file::read_files_ready_to_use,
            commands::file::delete_file,
            // Search commands
            commands::search::search_items,
            commands::search::search_items_paginated,
            // Socket client commands
            commands::socket::socket_client_connect,
            commands::socket::socket_client_connect_to,
            commands::socket::socket_client_is_connected_to_server,
            commands::socket::socket_client_disconnect_from,
            commands::socket::socket_client_disconnect_from_server,
            commands::socket::socket_client_is_connected,
            // Socket server commands
            commands::socket::socket_server_start,
            commands::socket::socket_server_stop,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

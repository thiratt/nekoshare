use tauri::Manager;
use tokio::sync::Mutex;

mod commands;
mod core;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            app.manage(Mutex::new(core::socket::NekoSocket::new()));
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
            commands::device::ns_get_device_info,
            commands::socket::connect_socket,
            commands::socket::disconnect_socket,
            commands::socket::send_socket_data,
            commands::socket::is_socket_connected,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

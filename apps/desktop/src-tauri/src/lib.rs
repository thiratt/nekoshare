use tokio::sync::mpsc;

use state::GlobalState;
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::{App, Emitter, Manager, State, WebviewWindow};

mod commands;
mod config;
mod core;
mod snap_layout;
mod state;

use core::socket::{ConnectionEvent, SocketManager};

use crate::core::device::DeviceManager;
use crate::core::socket::handlers::file::FileTransferService;
use crate::core::transfer_history::TransferHistoryService;

#[derive(Default)]
struct SnapLayouts(Mutex<HashMap<String, snap_layout::SnapLayoutHandle>>);

#[derive(Debug, Clone, serde::Serialize)]
struct WindowState {
    focused: bool,
    maximized: bool,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|_, _, _| {}))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_fs::init())
        .setup(setup_app)
        .on_window_event(|window, event| match event {
            tauri::WindowEvent::Focused(focused) => {
                let _ = window.emit("window-focus", *focused);
                let _ = window.emit(
                    "window-state",
                    WindowState {
                        focused: *focused,
                        maximized: window.is_maximized().unwrap_or(false),
                    },
                );
            }
            tauri::WindowEvent::Resized(_) => {
                let maximized = window.is_maximized().unwrap_or(false);
                let _ = window.emit("window-maximized", maximized);
                let _ = window.emit(
                    "window-state",
                    WindowState {
                        focused: window.is_focused().unwrap_or(true),
                        maximized,
                    },
                );
            }
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![
            // Auth callback
            commands::auth_callback::ns_start_google_auth_callback_server,
            commands::auth_callback::ns_wait_google_auth_callback_server,
            commands::auth_callback::ns_cancel_google_auth_callback_server,
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
            // Transfer History
            commands::transfer_history::transfer_history_list,
            commands::transfer_history::transfer_history_delete,
            commands::transfer_history::transfer_history_delete_transfer,
            // Socket Client
            commands::socket::socket_client_connect_to,
            commands::socket::socket_client_disconnect_from,
            commands::socket::socket_client_is_connected,
            commands::socket::socket_client_send_files,
            // Relay transfer debug path
            commands::relay::relay_send_files,
            commands::relay::relay_receive_transfer,
            // Socket Server
            commands::socket::socket_server_start,
            commands::socket::socket_server_stop,
            commands::socket::socket_server_has_active_connection,
            set_snap_layout_enabled,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn setup_app(app: &mut App) -> Result<(), Box<dyn std::error::Error>> {
    let transfer_history_service = TransferHistoryService::new()?;
    app.manage(SnapLayouts::default());

    GlobalState::new()
        .register(DeviceManager::new().expect("Failed to initialize DeviceManager"))
        .register(FileTransferService::new())
        .register(transfer_history_service)
        .init();

    let (event_tx, mut event_rx) = mpsc::channel::<ConnectionEvent>(256);
    let manager = SocketManager::new(event_tx);

    app.manage(manager);

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

    #[cfg(target_os = "windows")]
    {
        if let Some(window) = app.get_webview_window("main") {
            install_snap_overlay(app, &window)?;
        }
    }

    init_logging(app)?;

    Ok(())
}

#[cfg(target_os = "windows")]
fn install_snap_overlay<R: tauri::Runtime>(
    app: &tauri::App<R>,
    window: &WebviewWindow<R>,
) -> tauri::Result<()> {
    let window_for_setup = window.clone();
    let window_for_callback = window.clone();
    let app_handle = app.handle().clone();

    window.run_on_main_thread(move || {
        use snap_layout::{
            hwnd_from_tauri_window, install_snap_layout, MaxButtonEvent, SnapLayoutConfig,
            WindowCorner,
        };

        let hwnd = match hwnd_from_tauri_window(&window_for_setup) {
            Ok(hwnd) => hwnd,
            Err(err) => {
                eprintln!("failed to get HWND: {err}");
                return;
            }
        };

        let handle = match install_snap_layout(
            hwnd,
            SnapLayoutConfig {
                relative_to: WindowCorner::TopRight,
                offset_x: 48,
                offset_y: 0,
                width: 48,
                height: 44,
                hand_cursor: false,
            },
            move |evt| match evt {
                MaxButtonEvent::MouseEnter => {
                    let _ = window_for_callback.emit("snap-hover", true);
                }
                MaxButtonEvent::MouseLeave => {
                    let _ = window_for_callback.emit("snap-hover", false);
                }
                MaxButtonEvent::LeftButtonUp => {
                    let is_maximized = window_for_callback.is_maximized().unwrap_or(false);
                    let result = if is_maximized {
                        window_for_callback.unmaximize()
                    } else {
                        window_for_callback.maximize()
                    };

                    if let Err(err) = result {
                        eprintln!("failed to toggle maximize: {err}");
                    }

                    let maximized = window_for_callback.is_maximized().unwrap_or(!is_maximized);
                    let _ = window_for_callback.emit("window-maximized", maximized);
                }
                MaxButtonEvent::LeftButtonDown => {}
            },
        ) {
            Ok(handle) => handle,
            Err(err) => {
                eprintln!("failed to install snap layout overlay: {err}");
                return;
            }
        };

        let layouts = app_handle.state::<SnapLayouts>();
        layouts
            .0
            .lock()
            .unwrap()
            .insert(window_for_setup.label().to_string(), handle);

        let _ = window_for_setup.emit(
            "window-state",
            WindowState {
                focused: window_for_setup.is_focused().unwrap_or(true),
                maximized: window_for_setup.is_maximized().unwrap_or(false),
            },
        );
    })
}

#[tauri::command]
fn set_snap_layout_enabled(
    window: WebviewWindow,
    layouts: State<'_, SnapLayouts>,
    enabled: bool,
) -> Result<(), String> {
    let layouts = layouts
        .0
        .lock()
        .map_err(|_| "snap layout state is poisoned".to_string())?;

    if let Some(handle) = layouts.get(window.label()) {
        handle.set_enabled(enabled).map_err(|err| err.to_string())?;
    }

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

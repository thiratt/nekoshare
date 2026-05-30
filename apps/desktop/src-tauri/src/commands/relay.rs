use serde::{Deserialize, Serialize};
use tauri::AppHandle;

use crate::core::relay::{
    receive_relay_transfer, send_relay_files, RelayFileInput, RelayReceiveInput, RelaySendInput,
    RelayTransferError,
};

#[derive(Debug, Serialize)]
pub struct RelayCommandResponse {
    pub message: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RelaySendFilesCommand {
    pub transfer_id: String,
    pub relay_url: String,
    pub token: String,
    pub files: Vec<RelayFileInput>,
    pub target_device_id: String,
    pub source_user_id: Option<String>,
    pub source_user_name: Option<String>,
    pub source_device_id: String,
    pub source_device_name: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RelayReceiveTransferCommand {
    pub transfer_id: String,
    pub relay_url: String,
    pub token: String,
}

#[tauri::command]
pub async fn relay_send_files(
    app: AppHandle,
    input: RelaySendFilesCommand,
) -> Result<RelayCommandResponse, RelayTransferError> {
    let file_count = input.files.len();
    tauri::async_runtime::spawn(async move {
        let result = send_relay_files(
            app,
            RelaySendInput {
                transfer_id: input.transfer_id,
                relay_url: input.relay_url,
                token: input.token,
                files: input.files,
                target_device_id: input.target_device_id,
                source_user_id: input.source_user_id,
                source_user_name: input.source_user_name,
                source_device_id: input.source_device_id,
                source_device_name: input.source_device_name,
            },
        )
        .await;

        if let Err(error) = result {
            log::error!("Relay send failed: {}", error);
        }
    });

    Ok(RelayCommandResponse {
        message: format!("Queued {file_count} relay file(s)"),
    })
}

#[tauri::command]
pub async fn relay_receive_transfer(
    app: AppHandle,
    input: RelayReceiveTransferCommand,
) -> Result<RelayCommandResponse, RelayTransferError> {
    tauri::async_runtime::spawn(async move {
        let result = receive_relay_transfer(
            app,
            RelayReceiveInput {
                transfer_id: input.transfer_id,
                relay_url: input.relay_url,
                token: input.token,
            },
        )
        .await;

        if let Err(error) = result {
            log::error!("Relay receive failed: {}", error);
        }
    });

    Ok(RelayCommandResponse {
        message: "Relay receiver connected".to_string(),
    })
}

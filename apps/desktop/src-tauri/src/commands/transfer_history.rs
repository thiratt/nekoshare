use crate::core::transfer_history::{TransferHistoryRecord, TransferHistoryService};
use crate::state::GlobalState;

#[tauri::command]
pub async fn transfer_history_list(limit: Option<u32>) -> Result<Vec<TransferHistoryRecord>, String> {
    let service = GlobalState::get::<TransferHistoryService>();
    tokio::task::spawn_blocking(move || service.list_records(limit))
        .await
        .map_err(|err| format!("transfer history list task failed: {}", err))?
        .map_err(|err| format!("failed to read transfer history: {}", err))
}

#[tauri::command]
pub async fn transfer_history_delete(file_id: String) -> Result<(), String> {
    let service = GlobalState::get::<TransferHistoryService>();
    tokio::task::spawn_blocking(move || service.delete_by_file_id(&file_id))
        .await
        .map_err(|err| format!("transfer history delete task failed: {}", err))?
        .map_err(|err| format!("failed to delete transfer history record: {}", err))
}

#[tauri::command]
pub async fn transfer_history_delete_transfer(transfer_id: String) -> Result<(), String> {
    let service = GlobalState::get::<TransferHistoryService>();
    tokio::task::spawn_blocking(move || service.delete_by_transfer_id(&transfer_id))
        .await
        .map_err(|err| format!("transfer history delete-transfer task failed: {}", err))?
        .map_err(|err| format!("failed to delete transfer history transfer: {}", err))
}

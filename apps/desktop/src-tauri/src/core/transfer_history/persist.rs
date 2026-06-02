use super::model::TransferProgressEventPayload;
use super::service::TransferHistoryService;
use crate::state::GlobalState;

pub fn persist_transfer_progress_event(event: TransferProgressEventPayload) {
    let service = GlobalState::get::<TransferHistoryService>();
    tauri::async_runtime::spawn(async move {
        let write_result =
            tokio::task::spawn_blocking(move || service.upsert_progress_event(&event)).await;

        match write_result {
            Ok(Ok(())) => {}
            Ok(Err(err)) => {
                log::warn!("failed to persist transfer progress event: {}", err);
            }
            Err(join_err) => {
                log::warn!("transfer progress persistence task failed: {}", join_err);
            }
        }
    });
}

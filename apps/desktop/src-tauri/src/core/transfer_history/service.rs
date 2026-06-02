use anyhow::Result;

use super::model::{TransferHistoryRecord, TransferProgressEventPayload};
use super::repository::TransferHistoryRepository;

pub struct TransferHistoryService {
    repository: TransferHistoryRepository,
}

impl TransferHistoryService {
    pub fn new() -> Result<Self> {
        let repository = TransferHistoryRepository::new()?;
        Ok(Self { repository })
    }

    pub fn list_records(&self, limit: Option<u32>) -> Result<Vec<TransferHistoryRecord>> {
        self.repository.list_records(limit)
    }

    pub fn delete_by_file_id(&self, file_id: &str) -> Result<()> {
        self.repository.delete_by_file_id(file_id)
    }

    pub fn delete_by_transfer_id(&self, transfer_id: &str) -> Result<()> {
        self.repository.delete_by_transfer_id(transfer_id)
    }

    pub fn upsert_progress_event(&self, event: &TransferProgressEventPayload) -> Result<()> {
        self.repository.upsert_progress_event(event)
    }
}

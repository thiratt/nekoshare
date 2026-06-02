use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TransferProgressEventPayload {
    pub transfer_id: String,
    pub file_id: String,
    pub file_path: String,
    pub file_name: String,
    pub direction: String,
    pub source_user_id: Option<String>,
    pub source_user_name: Option<String>,
    pub source_device_id: Option<String>,
    pub source_device_name: Option<String>,
    pub same_account: Option<bool>,
    pub target_device_id: String,
    pub total_bytes: u64,
    pub sent_bytes: u64,
    pub progress_percent: f64,
    pub status: String,
    pub error: Option<String>,
    pub timestamp_ms: i64,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TransferHistoryRecord {
    pub transfer_id: String,
    pub file_id: String,
    pub file_path: String,
    pub file_name: String,
    pub direction: String,
    pub source_user_id: Option<String>,
    pub source_user_name: Option<String>,
    pub source_device_id: Option<String>,
    pub source_device_name: Option<String>,
    pub same_account: Option<bool>,
    pub target_device_id: String,
    pub total_bytes: u64,
    pub sent_bytes: u64,
    pub progress_percent: f64,
    pub status: String,
    pub error: Option<String>,
    pub started_at_ms: i64,
    pub updated_at_ms: i64,
}

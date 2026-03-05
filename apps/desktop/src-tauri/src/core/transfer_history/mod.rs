use anyhow::{Context, Result};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

use crate::state::GlobalState;

const DB_RELATIVE_DIR: &str = "Nekoshare/db";
const DB_FILE_NAME: &str = "transfer.sqlite";
const DEFAULT_LIST_LIMIT: u32 = 500;

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

pub struct TransferHistoryService {
    db_path: PathBuf,
}

impl TransferHistoryService {
    pub fn new() -> Result<Self> {
        let db_path = resolve_db_path()?;
        let db_parent = db_path.parent().context("transfer db parent missing")?;
        fs::create_dir_all(db_parent)
            .with_context(|| format!("failed to create transfer db dir {:?}", db_parent))?;

        let service = Self { db_path };
        service.init_schema()?;
        Ok(service)
    }

    pub fn list_records(&self, limit: Option<u32>) -> Result<Vec<TransferHistoryRecord>> {
        let conn = self.open_connection()?;
        let mut stmt = conn.prepare(
            r#"
            SELECT
                transfer_id,
                file_id,
                file_path,
                file_name,
                direction,
                source_user_id,
                source_user_name,
                source_device_id,
                source_device_name,
                same_account,
                target_device_id,
                total_bytes,
                sent_bytes,
                progress_percent,
                status,
                error,
                started_at_ms,
                updated_at_ms
            FROM transfer_history
            ORDER BY updated_at_ms DESC
            LIMIT ?1
            "#,
        )?;

        let rows = stmt.query_map(
            params![limit.unwrap_or(DEFAULT_LIST_LIMIT)],
            |row| -> rusqlite::Result<TransferHistoryRecord> {
                Ok(TransferHistoryRecord {
                    transfer_id: row.get(0)?,
                    file_id: row.get(1)?,
                    file_path: row.get(2)?,
                    file_name: row.get(3)?,
                    direction: row.get(4)?,
                    source_user_id: row.get(5)?,
                    source_user_name: row.get(6)?,
                    source_device_id: row.get(7)?,
                    source_device_name: row.get(8)?,
                    same_account: int_to_bool(row.get(9)?),
                    target_device_id: row.get(10)?,
                    total_bytes: row.get(11)?,
                    sent_bytes: row.get(12)?,
                    progress_percent: row.get(13)?,
                    status: row.get(14)?,
                    error: row.get(15)?,
                    started_at_ms: row.get(16)?,
                    updated_at_ms: row.get(17)?,
                })
            },
        )?;

        let mut records = Vec::new();
        for row in rows {
            records.push(row?);
        }

        Ok(records)
    }

    pub fn delete_by_file_id(&self, file_id: &str) -> Result<()> {
        let conn = self.open_connection()?;
        conn.execute(
            "DELETE FROM transfer_history WHERE file_id = ?1",
            params![file_id],
        )?;
        Ok(())
    }

    pub fn upsert_progress_event(&self, event: &TransferProgressEventPayload) -> Result<()> {
        if event.file_id.trim().is_empty() {
            return self.mark_batch_failed(event);
        }

        let conn = self.open_connection()?;
        conn.execute(
            r#"
            INSERT INTO transfer_history (
                transfer_id,
                file_id,
                file_path,
                file_name,
                direction,
                source_user_id,
                source_user_name,
                source_device_id,
                source_device_name,
                same_account,
                target_device_id,
                total_bytes,
                sent_bytes,
                progress_percent,
                status,
                error,
                started_at_ms,
                updated_at_ms
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18)
            ON CONFLICT(file_id) DO UPDATE SET
                transfer_id = excluded.transfer_id,
                file_path = excluded.file_path,
                file_name = excluded.file_name,
                direction = excluded.direction,
                source_user_id = excluded.source_user_id,
                source_user_name = excluded.source_user_name,
                source_device_id = excluded.source_device_id,
                source_device_name = excluded.source_device_name,
                same_account = excluded.same_account,
                target_device_id = excluded.target_device_id,
                total_bytes = excluded.total_bytes,
                sent_bytes = excluded.sent_bytes,
                progress_percent = excluded.progress_percent,
                status = excluded.status,
                error = excluded.error,
                started_at_ms = CASE
                    WHEN transfer_history.started_at_ms <= excluded.started_at_ms THEN transfer_history.started_at_ms
                    ELSE excluded.started_at_ms
                END,
                updated_at_ms = excluded.updated_at_ms
            "#,
            params![
                event.transfer_id,
                event.file_id,
                event.file_path,
                event.file_name,
                event.direction,
                event.source_user_id,
                event.source_user_name,
                event.source_device_id,
                event.source_device_name,
                bool_to_int(event.same_account),
                event.target_device_id,
                event.total_bytes,
                event.sent_bytes,
                clamp_progress(event.progress_percent),
                event.status,
                event.error,
                event.timestamp_ms,
                event.timestamp_ms
            ],
        )?;

        Ok(())
    }

    fn init_schema(&self) -> Result<()> {
        let conn = self.open_connection()?;
        conn.execute_batch(
            r#"
            PRAGMA journal_mode = WAL;
            PRAGMA synchronous = NORMAL;

            CREATE TABLE IF NOT EXISTS transfer_history (
                file_id TEXT PRIMARY KEY,
                transfer_id TEXT NOT NULL,
                file_path TEXT NOT NULL,
                file_name TEXT NOT NULL,
                direction TEXT NOT NULL CHECK(direction IN ('send', 'receive')),
                source_user_id TEXT NULL,
                source_user_name TEXT NULL,
                source_device_id TEXT NULL,
                source_device_name TEXT NULL,
                same_account INTEGER NULL,
                target_device_id TEXT NOT NULL,
                total_bytes INTEGER NOT NULL DEFAULT 0,
                sent_bytes INTEGER NOT NULL DEFAULT 0,
                progress_percent REAL NOT NULL DEFAULT 0,
                status TEXT NOT NULL CHECK(status IN ('processing', 'success', 'failed')),
                error TEXT NULL,
                started_at_ms INTEGER NOT NULL,
                updated_at_ms INTEGER NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_transfer_history_updated_at
            ON transfer_history(updated_at_ms DESC);

            CREATE INDEX IF NOT EXISTS idx_transfer_history_transfer_id
            ON transfer_history(transfer_id);
            "#,
        )?;

        Ok(())
    }

    fn open_connection(&self) -> Result<Connection> {
        let conn = Connection::open(&self.db_path)
            .with_context(|| format!("failed to open transfer db {:?}", self.db_path))?;
        conn.busy_timeout(std::time::Duration::from_millis(3_000))
            .with_context(|| "failed to configure sqlite busy timeout")?;
        Ok(conn)
    }

    fn mark_batch_failed(&self, event: &TransferProgressEventPayload) -> Result<()> {
        let conn = self.open_connection()?;
        conn.execute(
            r#"
            UPDATE transfer_history
            SET
                status = 'failed',
                error = COALESCE(?1, error),
                updated_at_ms = ?2
            WHERE transfer_id = ?3
              AND status = 'processing'
            "#,
            params![event.error, event.timestamp_ms, event.transfer_id],
        )?;
        Ok(())
    }
}

pub fn persist_transfer_progress_event(event: TransferProgressEventPayload) {
    let service = GlobalState::get::<TransferHistoryService>();
    tauri::async_runtime::spawn(async move {
        let write_result = tokio::task::spawn_blocking(move || service.upsert_progress_event(&event)).await;

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

fn resolve_db_path() -> Result<PathBuf> {
    if let Some(local_app_data) = std::env::var_os("LOCALAPPDATA") {
        let mut path = PathBuf::from(local_app_data);
        path.push(DB_RELATIVE_DIR);
        path.push(DB_FILE_NAME);
        return Ok(path);
    }

    let project_dirs = directories::ProjectDirs::from("", "", "Nekoshare")
        .context("failed to resolve project dirs for transfer db")?;
    let mut path = PathBuf::from(project_dirs.data_local_dir());
    path.push("db");
    path.push(DB_FILE_NAME);
    Ok(path)
}

fn bool_to_int(value: Option<bool>) -> Option<i64> {
    value.map(|flag| if flag { 1 } else { 0 })
}

fn int_to_bool(value: Option<i64>) -> Option<bool> {
    value.map(|flag| flag != 0)
}

fn clamp_progress(value: f64) -> f64 {
    if !value.is_finite() {
        return 0.0;
    }
    value.clamp(0.0, 100.0)
}

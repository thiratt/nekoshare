use anyhow::{Context, Result};
use rusqlite::{params, Connection, Row};
use std::fs;
use std::path::PathBuf;

use super::model::{TransferHistoryRecord, TransferProgressEventPayload};
use super::path::resolve_db_path;
use super::schema::init_transfer_history_schema;

const DEFAULT_LIST_LIMIT: u32 = 500;

pub(crate) struct TransferHistoryRepository {
    db_path: PathBuf,
}

impl TransferHistoryRepository {
    pub(crate) fn new() -> Result<Self> {
        let db_path = resolve_db_path()?;
        let db_parent = db_path.parent().context("transfer db parent missing")?;
        fs::create_dir_all(db_parent)
            .with_context(|| format!("failed to create transfer db dir {:?}", db_parent))?;

        let repository = Self { db_path };
        repository.init_schema()?;
        Ok(repository)
    }

    pub(crate) fn list_records(&self, limit: Option<u32>) -> Result<Vec<TransferHistoryRecord>> {
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
            map_transfer_history_record,
        )?;

        let mut records = Vec::new();
        for row in rows {
            records.push(row?);
        }

        Ok(records)
    }

    pub(crate) fn delete_by_file_id(&self, file_id: &str) -> Result<()> {
        let conn = self.open_connection()?;
        conn.execute(
            "DELETE FROM transfer_history WHERE file_id = ?1",
            params![file_id],
        )?;
        Ok(())
    }

    pub(crate) fn delete_by_transfer_id(&self, transfer_id: &str) -> Result<()> {
        let conn = self.open_connection()?;
        conn.execute(
            "DELETE FROM transfer_history WHERE transfer_id = ?1",
            params![transfer_id],
        )?;
        Ok(())
    }

    pub(crate) fn upsert_progress_event(&self, event: &TransferProgressEventPayload) -> Result<()> {
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
                transfer_id = CASE
                    WHEN excluded.updated_at_ms >= transfer_history.updated_at_ms THEN excluded.transfer_id
                    ELSE transfer_history.transfer_id
                END,
                file_path = CASE
                    WHEN excluded.updated_at_ms >= transfer_history.updated_at_ms THEN excluded.file_path
                    ELSE transfer_history.file_path
                END,
                file_name = CASE
                    WHEN excluded.updated_at_ms >= transfer_history.updated_at_ms THEN excluded.file_name
                    ELSE transfer_history.file_name
                END,
                direction = CASE
                    WHEN excluded.updated_at_ms >= transfer_history.updated_at_ms THEN excluded.direction
                    ELSE transfer_history.direction
                END,
                source_user_id = CASE
                    WHEN excluded.updated_at_ms >= transfer_history.updated_at_ms THEN excluded.source_user_id
                    ELSE transfer_history.source_user_id
                END,
                source_user_name = CASE
                    WHEN excluded.updated_at_ms >= transfer_history.updated_at_ms THEN excluded.source_user_name
                    ELSE transfer_history.source_user_name
                END,
                source_device_id = CASE
                    WHEN excluded.updated_at_ms >= transfer_history.updated_at_ms THEN excluded.source_device_id
                    ELSE transfer_history.source_device_id
                END,
                source_device_name = CASE
                    WHEN excluded.updated_at_ms >= transfer_history.updated_at_ms THEN excluded.source_device_name
                    ELSE transfer_history.source_device_name
                END,
                same_account = CASE
                    WHEN excluded.updated_at_ms >= transfer_history.updated_at_ms THEN excluded.same_account
                    ELSE transfer_history.same_account
                END,
                target_device_id = CASE
                    WHEN excluded.updated_at_ms >= transfer_history.updated_at_ms THEN excluded.target_device_id
                    ELSE transfer_history.target_device_id
                END,
                total_bytes = MAX(transfer_history.total_bytes, excluded.total_bytes),
                sent_bytes = CASE
                    WHEN transfer_history.status = 'success' THEN transfer_history.total_bytes
                    WHEN excluded.status = 'success' THEN MAX(excluded.sent_bytes, excluded.total_bytes)
                    ELSE MAX(transfer_history.sent_bytes, excluded.sent_bytes)
                END,
                progress_percent = CASE
                    WHEN transfer_history.status = 'success' OR excluded.status = 'success' THEN 100.0
                    ELSE MAX(transfer_history.progress_percent, excluded.progress_percent)
                END,
                status = CASE
                    WHEN transfer_history.status = 'success' THEN 'success'
                    WHEN excluded.status = 'success' THEN 'success'
                    WHEN transfer_history.status = 'failed' AND excluded.status = 'processing' THEN 'failed'
                    ELSE excluded.status
                END,
                error = CASE
                    WHEN excluded.status = 'success' THEN NULL
                    WHEN excluded.error IS NOT NULL THEN excluded.error
                    ELSE transfer_history.error
                END,
                started_at_ms = MIN(transfer_history.started_at_ms, excluded.started_at_ms),
                updated_at_ms = MAX(transfer_history.updated_at_ms, excluded.updated_at_ms)
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

    pub(crate) fn mark_batch_failed(&self, event: &TransferProgressEventPayload) -> Result<()> {
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

    fn init_schema(&self) -> Result<()> {
        let conn = self.open_connection()?;
        init_transfer_history_schema(&conn)
    }

    fn open_connection(&self) -> Result<Connection> {
        let conn = Connection::open(&self.db_path)
            .with_context(|| format!("failed to open transfer db {:?}", self.db_path))?;
        conn.busy_timeout(std::time::Duration::from_millis(3_000))
            .with_context(|| "failed to configure sqlite busy timeout")?;
        Ok(conn)
    }
}

pub(crate) fn map_transfer_history_record(
    row: &Row<'_>,
) -> rusqlite::Result<TransferHistoryRecord> {
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

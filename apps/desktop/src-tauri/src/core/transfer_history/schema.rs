use anyhow::Result;
use rusqlite::Connection;

pub(crate) fn init_transfer_history_schema(conn: &Connection) -> Result<()> {
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

            UPDATE transfer_history
            SET
                progress_percent = 100.0,
                sent_bytes = total_bytes,
                error = NULL
            WHERE status = 'success' AND (progress_percent < 100.0 OR sent_bytes < total_bytes);

            UPDATE transfer_history
            SET
                status = 'success',
                progress_percent = 100.0,
                sent_bytes = total_bytes,
                error = NULL
            WHERE status = 'processing' AND total_bytes > 0 AND sent_bytes >= total_bytes;
            "#,
    )?;

    Ok(())
}

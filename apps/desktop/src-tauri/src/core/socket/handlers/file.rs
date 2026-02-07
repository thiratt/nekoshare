use dashmap::DashMap;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use tokio::fs::File;
use tokio::io::{AsyncWriteExt, BufWriter};
use tokio::sync::{Mutex, RwLock};

use crate::core::socket::{BinaryReader, Connection, PacketRouter, PacketType, SocketResult};
use crate::core::socket::{SocketError, TransferConfig};

struct TransferState {
    writer: Mutex<BufWriter<File>>,
    file_path: PathBuf,
    expected_size: u64,
    received_size: AtomicU64,
}

type TransferMap = DashMap<(String, String), Arc<TransferState>>;

static ACTIVE_TRANSFERS: std::sync::OnceLock<TransferMap> = std::sync::OnceLock::new();
static RECEIVE_BASE_DIR: std::sync::OnceLock<RwLock<Option<PathBuf>>> = std::sync::OnceLock::new();

fn get_transfers() -> &'static TransferMap {
    ACTIVE_TRANSFERS.get_or_init(DashMap::new)
}

fn get_receive_base_dir() -> &'static RwLock<Option<PathBuf>> {
    RECEIVE_BASE_DIR.get_or_init(|| RwLock::new(None))
}

pub async fn set_receive_base_dir(path: Option<PathBuf>) {
    *get_receive_base_dir().write().await = path;
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FileMetadata {
    pub id: String,
    pub name: String,
    pub size: u64,
}

async fn handle_file_offer(
    conn: Arc<Connection>,
    payload: Vec<u8>,
    _req_id: i32,
) -> SocketResult<()> {
    let config = TransferConfig::global();
    let metadata: FileMetadata =
        serde_json::from_slice(&payload).map_err(|e| SocketError::parse(e.to_string()))?;

    log::info!("Starting transfer: {} ({})", metadata.name, metadata.size);

    let user_dirs = directories::UserDirs::new()
        .ok_or_else(|| SocketError::other("Failed to get user directories"))?;
    let default_download_dir = user_dirs
        .download_dir()
        .ok_or_else(|| SocketError::other("Failed to get download directory"))?;

    let mut base_dir = get_receive_base_dir()
        .read()
        .await
        .clone()
        .unwrap_or_else(|| default_download_dir.to_path_buf());

    if let Err(e) = tokio::fs::create_dir_all(&base_dir).await {
        log::warn!(
            "Failed to use configured receive directory {:?}: {}. Falling back to Downloads.",
            base_dir,
            e
        );
        base_dir = default_download_dir.to_path_buf();
        tokio::fs::create_dir_all(&base_dir).await.map_err(|err| {
            SocketError::other(format!(
                "Failed to create fallback receive directory {:?}: {}",
                base_dir, err
            ))
        })?;
    }

    let file_path = base_dir.join(&metadata.name);
    log::info!("Receive target path: {:?}", file_path);

    let file = File::create(&file_path).await?;

    if config.preallocate_files && metadata.size > 0 {
        if let Err(e) = file.set_len(metadata.size).await {
            log::warn!("Failed to pre-allocate file: {}", e);
        }
    }

    let writer = BufWriter::with_capacity(config.write_buffer_size, file);
    let conn_id = conn.id().to_string();

    let state = Arc::new(TransferState {
        writer: Mutex::new(writer),
        file_path: file_path.clone(),
        expected_size: metadata.size,
        received_size: AtomicU64::new(0),
    });

    get_transfers().insert((conn_id, metadata.id), state);

    Ok(())
}

async fn handle_file_chunk(
    conn: Arc<Connection>,
    payload: Vec<u8>,
    _req_id: i32,
) -> SocketResult<()> {
    let config = TransferConfig::global();

    let mut reader = BinaryReader::new(&payload);
    let file_id = reader
        .read_string()
        .map_err(|e| SocketError::parse(e.to_string()))?;
    let chunk = reader.remaining_bytes();
    let chunk_len = chunk.len() as u64;
    let conn_id = conn.id().to_string();

    let state = {
        get_transfers()
            .get(&(conn_id.clone(), file_id.clone()))
            .map(|r| r.value().clone())
    };

    if let Some(state) = state {
        let mut writer = state.writer.lock().await;
        writer.write_all(chunk).await?;

        let current_size = state.received_size.fetch_add(chunk_len, Ordering::SeqCst) + chunk_len;

        if current_size >= state.expected_size {
            writer.flush().await?;
            if config.sync_on_complete {
                writer.get_ref().sync_all().await?;
            }

            log::info!("Transfer complete: {:?}", state.file_path);

            get_transfers().remove(&(conn_id, file_id));
        }
    } else {
        log::debug!("Received chunk for unknown transfer: {}", file_id);
    }

    Ok(())
}

async fn handle_file_finish(
    conn: Arc<Connection>,
    payload: Vec<u8>,
    _req_id: i32,
) -> SocketResult<()> {
    let config = TransferConfig::global();
    let mut reader = BinaryReader::new(&payload);
    let file_id = reader
        .read_string()
        .map_err(|e| SocketError::parse(e.to_string()))?;

    let conn_id = conn.id().to_string();

    if let Some((_, state)) = get_transfers().remove(&(conn_id, file_id)) {
        let mut writer = state.writer.lock().await;
        writer.flush().await?;

        if config.sync_on_complete {
            writer.get_ref().sync_all().await?;
        }
        log::info!("File finished manually: {:?}", state.file_path);
    }

    Ok(())
}

pub async fn register_file_handlers(router: &PacketRouter) {
    router
        .register(PacketType::FileOffer, |conn, payload, req_id| {
            Box::pin(handle_file_offer(conn, payload, req_id))
        })
        .await;

    router
        .register(PacketType::FileChunk, |conn, payload, req_id| {
            Box::pin(handle_file_chunk(conn, payload, req_id))
        })
        .await;

    router
        .register(PacketType::FileFinish, |conn, payload, req_id| {
            Box::pin(handle_file_finish(conn, payload, req_id))
        })
        .await;
}

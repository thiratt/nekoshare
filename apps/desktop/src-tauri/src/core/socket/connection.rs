use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::{Arc, Mutex as StdMutex};
use tokio::io::{AsyncReadExt, AsyncWriteExt, BufReader, BufWriter, WriteHalf};
use tokio::sync::{mpsc, oneshot, Mutex as TokioMutex, RwLock};

use crate::core::socket::stream::SocketStream;

use super::binary::BinaryWriter;
use super::error::{Context, SocketError, SocketResult};
use super::protocol::{PacketType, HEADER_SIZE};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ConnectionState {
    Disconnected,
    Connecting,
    Connected,
    Authenticated,
    Closing,
}

#[derive(Default, Debug, Clone, Serialize, Deserialize)]
pub struct UserInfo {
    pub id: String,
    pub name: String,
}

pub struct Connection {
    id: String,
    state: RwLock<ConnectionState>,
    writer: TokioMutex<Option<BufWriter<WriteHalf<SocketStream>>>>,
    user: RwLock<Option<UserInfo>>,
    request_id_counter: AtomicU32,
    closing: AtomicBool,
    outgoing_tx: mpsc::Sender<Vec<u8>>,
    pending_requests: StdMutex<HashMap<i32, oneshot::Sender<Vec<u8>>>>,
}

impl Connection {
    pub fn new(
        id: String,
        stream: SocketStream,
    ) -> (Arc<Self>, mpsc::Receiver<(PacketType, i32, Vec<u8>)>) {
        let (read_half, write_half) = tokio::io::split(stream);
        let (outgoing_tx, outgoing_rx) = mpsc::channel::<Vec<u8>>(256);
        let (incoming_tx, incoming_rx) = mpsc::channel::<(PacketType, i32, Vec<u8>)>(256);

        let connection = Arc::new(Self {
            id,
            state: RwLock::new(ConnectionState::Connected),
            writer: TokioMutex::new(Some(BufWriter::new(write_half))),
            user: RwLock::new(None),
            request_id_counter: AtomicU32::new(1),
            closing: AtomicBool::new(false),
            outgoing_tx,
            pending_requests: StdMutex::new(HashMap::new()),
        });

        let conn_clone = Arc::clone(&connection);
        tokio::spawn(async move {
            if let Err(e) = Self::read_loop(conn_clone, read_half, incoming_tx).await {
                log::debug!("Read loop ended: {}", e);
            }
        });

        let conn_clone = Arc::clone(&connection);
        tokio::spawn(async move {
            if let Err(e) = Self::write_loop(conn_clone, outgoing_rx).await {
                log::debug!("Write loop ended: {}", e);
            }
        });

        (connection, incoming_rx)
    }

    pub fn id(&self) -> &str {
        &self.id
    }

    pub async fn state(&self) -> ConnectionState {
        *self.state.read().await
    }

    pub async fn is_authenticated(&self) -> bool {
        *self.state.read().await == ConnectionState::Authenticated
    }

    pub async fn user(&self) -> Option<UserInfo> {
        self.user.read().await.clone()
    }

    pub async fn set_authenticated(&self, user: UserInfo) {
        *self.user.write().await = Some(user);
        *self.state.write().await = ConnectionState::Authenticated;
    }

    pub fn next_request_id(&self) -> i32 {
        self.request_id_counter.fetch_add(1, Ordering::SeqCst) as i32
    }

    pub async fn send_packet<F>(
        &self,
        packet_type: PacketType,
        payload_writer: F,
    ) -> SocketResult<i32>
    where
        F: FnOnce(&mut BinaryWriter),
    {
        let request_id = self.next_request_id();
        self.send_packet_with_id(packet_type, request_id, payload_writer)
            .await?;
        Ok(request_id)
    }

    pub async fn send_packet_with_id<F>(
        &self,
        packet_type: PacketType,
        request_id: i32,
        payload_writer: F,
    ) -> SocketResult<()>
    where
        F: FnOnce(&mut BinaryWriter),
    {
        if self.closing.load(Ordering::SeqCst) {
            return Err(SocketError::ConnectionClosed.into());
        }

        let mut writer = BinaryWriter::with_capacity(64);

        writer.write_u32(0);
        let body_start = writer.len();

        writer.write_u8(packet_type as u8);
        writer.write_i32(request_id);
        payload_writer(&mut writer);

        let body_len = (writer.len() - body_start) as u32;
        writer.write_u32_at(0, body_len);

        if packet_type != PacketType::SystemHeartbeat {
            log::debug!(
                "Sending packet: {:?} (id: {}, len: {})",
                packet_type,
                request_id,
                body_len
            );
        }

        self.outgoing_tx
            .send(writer.into_bytes())
            .await
            .context("failed to queue packet for sending")?;
        Ok(())
    }

    pub async fn send_raw(
        &self,
        packet_type: PacketType,
        request_id: i32,
        payload: &[u8],
    ) -> SocketResult<()> {
        if self.closing.load(Ordering::SeqCst) {
            return Err(SocketError::ConnectionClosed.into());
        }

        let body_len = (HEADER_SIZE + payload.len()) as u32;

        let mut writer = BinaryWriter::with_capacity(4 + body_len as usize);
        writer.write_u32(body_len);
        writer.write_u8(packet_type as u8);
        writer.write_i32(request_id);
        writer.write_bytes(payload);

        self.outgoing_tx
            .send(writer.into_bytes())
            .await
            .context("failed to queue raw packet for sending")?;
        Ok(())
    }

    pub async fn close(&self) {
        self.closing.store(true, Ordering::SeqCst);
        *self.state.write().await = ConnectionState::Closing;

        if let Some(mut writer) = self.writer.lock().await.take() {
            let _ = writer.shutdown().await;
        }
    }

    pub async fn request<F>(
        &self,
        packet_type: PacketType,
        payload_writer: F,
    ) -> SocketResult<Vec<u8>>
    where
        F: FnOnce(&mut BinaryWriter),
    {
        let request_id = self.next_request_id();
        let (tx, rx) = oneshot::channel();

        {
            let mut pending = self
                .pending_requests
                .lock()
                .map_err(|e| SocketError::ServerError(format!("Request mutex poisoned: {}", e)))?;

            pending.insert(request_id, tx);
        }

        if let Err(e) = self
            .send_packet_with_id(packet_type, request_id, payload_writer)
            .await
        {
            let mut pending = self.pending_requests.lock().map_err(|e| {
                SocketError::ServerError(format!("Request mutex poisoned during cleanup: {}", e))
            })?;

            pending.remove(&request_id);
            return Err(e);
        }

        match rx.await {
            Ok(payload) => Ok(payload),
            Err(_) => Err(SocketError::ConnectionClosed.into()),
        }
    }
    pub fn is_closing(&self) -> bool {
        self.closing.load(Ordering::SeqCst)
    }

    async fn read_loop(
        conn: Arc<Self>,
        read_half: tokio::io::ReadHalf<SocketStream>,
        incoming_tx: mpsc::Sender<(PacketType, i32, Vec<u8>)>,
    ) -> SocketResult<()> {
        let mut reader = BufReader::new(read_half);

        loop {
            if conn.closing.load(Ordering::SeqCst) {
                break;
            }

            let mut len_buf = [0u8; 4];
            match reader.read_exact(&mut len_buf).await {
                Ok(_) => {}
                Err(e) if e.kind() == std::io::ErrorKind::UnexpectedEof => {
                    log::debug!("Connection closed by peer");
                    break;
                }
                Err(e) => {
                    log::error!("Read error (length): {}", e);
                    break;
                }
            }

            let frame_len = u32::from_le_bytes(len_buf) as usize;

            let mut frame_buf = vec![0u8; frame_len];
            match reader.read_exact(&mut frame_buf).await {
                Ok(_) => {}
                Err(e) => {
                    log::error!("Read error (body, expected {} bytes): {}", frame_len, e);
                    break;
                }
            }

            if frame_len < HEADER_SIZE {
                log::error!("Frame too short: {}", frame_len);
                continue;
            }

            let packet_type = PacketType::from_u8(frame_buf[0]);
            let request_id =
                i32::from_le_bytes([frame_buf[1], frame_buf[2], frame_buf[3], frame_buf[4]]);
            let mut payload_opt = Some(frame_buf[HEADER_SIZE..].to_vec());
            let mut is_handled = false;

            {
                match conn.pending_requests.lock() {
                    Ok(mut pending) => {
                        if let Some(tx) = pending.remove(&request_id) {
                            if let Some(payload_data) = payload_opt.take() {
                                if tx.send(payload_data).is_ok() {
                                    is_handled = true;
                                }
                            }
                        }
                    }
                    Err(e) => {
                        log::error!("Pending requests mutex poisoned: {}", e);
                        return Err(
                            SocketError::ServerError("Internal state corrupted".into()).into()
                        );
                    }
                }
            }

            if !is_handled {
                if let Some(payload_data) = payload_opt {
                    if packet_type != PacketType::SystemHeartbeat {
                        log::debug!("Received packet pushed to queue: {:?}", packet_type);
                    }

                    if incoming_tx
                        .send((packet_type, request_id, payload_data))
                        .await
                        .is_err()
                    {
                        log::debug!("Incoming channel closed");
                        break;
                    }
                }
            }
        }

        match conn.pending_requests.lock() {
            Ok(mut pending) => pending.clear(),
            Err(e) => log::error!("Failed to clear pending requests (mutex poisoned): {}", e),
        }

        conn.close().await;
        Ok(())
    }

    async fn write_loop(
        conn: Arc<Self>,
        mut outgoing_rx: mpsc::Receiver<Vec<u8>>,
    ) -> SocketResult<()> {
        while let Some(data) = outgoing_rx.recv().await {
            let mut writer_guard = conn.writer.lock().await;
            if let Some(writer) = writer_guard.as_mut() {
                if let Err(e) = writer.write_all(&data).await {
                    log::error!("Write error: {}", e);
                    break;
                }
                if let Err(e) = writer.flush().await {
                    log::error!("Flush error: {}", e);
                    break;
                }
            } else {
                break;
            }
        }

        conn.close().await;
        Ok(())
    }
}

impl std::fmt::Debug for Connection {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("Connection")
            .field("id", &self.id)
            .field("closing", &self.closing.load(Ordering::SeqCst))
            .finish()
    }
}

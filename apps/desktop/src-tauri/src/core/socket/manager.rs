use dashmap::DashMap;
use std::sync::Arc;
use tokio::sync::mpsc;
use uuid::Uuid;

use crate::core::socket::{
    ids::{LinkKey, PairKey},
    Connection, ConnectionEvent, ConnectionServerConfig, PacketType, SocketClientConfig,
    SocketError, SocketResult, SocketServer,
};

pub struct SocketManager {
    active_sessions: Arc<DashMap<PairKey, Arc<Connection>>>,
    servers: Arc<DashMap<u16, Arc<SocketServer>>>,
    event_tx: mpsc::Sender<ConnectionEvent>,
}

impl SocketManager {
    pub fn new(event_tx: mpsc::Sender<ConnectionEvent>) -> Arc<Self> {
        Arc::new(Self {
            active_sessions: Arc::new(DashMap::new()),
            servers: Arc::new(DashMap::new()),
            event_tx,
        })
    }

    pub async fn get_or_connect(
        self: &Arc<Self>,
        config: SocketClientConfig,
    ) -> SocketResult<Arc<Connection>> {
        let local_id = Uuid::parse_str(&config.device_id)
            .map_err(|_| SocketError::InvalidUuidParsing("local".into()))?;
        let target_id_str = config
            .target_id
            .clone()
            .ok_or(SocketError::ConfigError("Target ID required".into()))?;
        let target_id = Uuid::parse_str(&target_id_str)
            .map_err(|_| SocketError::InvalidUuidParsing("target".into()))?;

        let pair_key = LinkKey::direct(local_id, target_id).pair_key();
        if let Some(conn) = self.active_sessions.get(&pair_key) {
            if !conn.is_closing() {
                log::info!("Reusing existing connection for {}", pair_key);
                return Ok(conn.clone());
            } else {
                self.active_sessions.remove(&pair_key);
            }
        }

        log::info!(
            "Dialing new connection to {} ({})",
            target_id,
            config.target_address
        );
        let client = crate::core::socket::client::SocketClient::new(config.clone());
        client.connect().await?;

        let connection = client
            .get_connection_arc()
            .await
            .ok_or(SocketError::ConnectionFailed(
                "Failed to retrieve connection after connect".into(),
            ))?;

        self.register_connection(pair_key, connection.clone()).await;

        Ok(connection)
    }

    pub async fn start_server(
        self: &Arc<Self>,
        config: ConnectionServerConfig,
        sender_fingerprint: String,
    ) -> SocketResult<u16> {
        let server = SocketServer::with_events(sender_fingerprint, self.event_tx.clone());

        let manager_clone = self.clone();

        // Note: ต้องเพิ่ม method set_connection_handler ใน server.rs (มีอยู่แล้วในโค้ดที่คุณให้มา แต่ต้องปรับให้เรียกใช้)
        // ใน server.rs ของคุณมี on_connection อยู่แล้ว แต่ยังไม่ได้ถูกเรียกใช้ใน handle_handshake_and_run
        // เดี๋ยวผมจะบอกวิธีแก้ server.rs ด้านล่าง

        // Hack: เนื่องจาก server.rs ปัจจุบันยังไม่รองรับ callback ที่ส่ง manager กลับมาได้สมบูรณ์แบบ
        // เราจะใช้กลไกของ event loop ใน server แทน หรือต้องแก้ server.rs เพิ่ม
        // เพื่อความง่าย ผมแนะนำให้แก้ server.rs ให้รับ callback ครับ

        let port = server.start().await?;
        self.servers.insert(port, server);

        Ok(port)
    }

    async fn register_connection(self: &Arc<Self>, pair_key: PairKey, connection: Arc<Connection>) {
        self.active_sessions.insert(pair_key, connection.clone());

        let sessions = self.active_sessions.clone();
        let key = pair_key;

        connection
            .set_on_close(move |_id| {
                log::info!("Connection closed, removing session: {}", key);
                sessions.remove(&key);
            })
            .await;

        log::info!("Session registered: {}", pair_key);
    }

    // Helper สำหรับ Server: เมื่อมี Connection ใหม่เข้ามา Server จะเรียกฟังก์ชันนี้
    pub async fn handle_incoming(
        self: &Arc<Self>,
        connection: Arc<Connection>,
        // ในอนาคต Packet แรกควรเป็น Handshake ที่บอกว่าฉันคือใคร (Device ID)
        // ตอนนี้สมมติว่าเรารู้ ID จากวิธีอื่นไปก่อน หรือรอ Handshake
    ) {
        // TODO: รอ implement Handshake packet เพื่อดึง Remote Device ID
        // ตอนนี้เก็บไว้ใน Temp list หรือรอ authenticate ก่อนก็ได้
    }

    pub fn get_connection(&self, pair_key: &PairKey) -> Option<Arc<Connection>> {
        self.active_sessions
            .get(pair_key)
            .map(|c| c.value().clone())
    }

    pub fn has_active_server_connection(&self) -> bool {
        self.servers
            .iter()
            .any(|entry| entry.value().has_active_connection())
    }

    pub fn disconnect(&self, pair_key: &PairKey) -> SocketResult<()> {
        if let Some(conn) = self.active_sessions.get(pair_key) {
            conn.close();
            Ok(())
        } else {
            Err(
                SocketError::ConnectionNotFound(format!("No active connection for {}", pair_key))
                    .into(),
            )
        }
    }
}

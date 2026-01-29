use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tokio::net::TcpStream;
use tokio::sync::{oneshot, Mutex, RwLock};
use tokio::time::{self, Duration};
use tokio_rustls::rustls::pki_types::ServerName;
use tokio_rustls::rustls::{self, ClientConfig};
use tokio_rustls::TlsConnector;
use uuid::Uuid;

use crate::core::socket::stream::SocketStream;
use crate::core::socket::tls::load_certificates;

use super::binary::BinaryWriter;
use super::config::SocketClientConfig;
use super::connection::{Connection, UserInfo};
use super::error::{Context, SocketError, SocketResult};
use super::protocol::PacketType;
use super::router::PacketRouter;

pub struct SocketClient {
    config: SocketClientConfig,
    connection: RwLock<Option<Arc<Connection>>>,
    router: Arc<PacketRouter>,
    is_running: AtomicBool,
    auth_response: Mutex<Option<oneshot::Sender<SocketResult<UserInfo>>>>,
}

impl SocketClient {
    pub fn new(config: SocketClientConfig) -> Arc<Self> {
        Arc::new(Self {
            config,
            connection: RwLock::new(None),
            router: Arc::new(PacketRouter::new()),
            is_running: AtomicBool::new(false),
            auth_response: Mutex::new(None),
        })
    }

    pub fn router(&self) -> &PacketRouter {
        &self.router
    }

    pub async fn is_connected(&self) -> bool {
        let conn = self.connection.read().await.clone();
        if let Some(conn) = conn {
            !conn.is_closing()
        } else {
            false
        }
    }

    pub async fn is_authenticated(&self) -> bool {
        let conn = self.connection.read().await.clone();
        if let Some(conn) = conn {
            conn.is_authenticated().await
        } else {
            false
        }
    }

    pub async fn connect(self: &Arc<Self>) -> SocketResult<()> {
        let address = self.config.target_address.clone();

        let tls_domain = if self.config.use_tls {
            Some(address.split(':').next().unwrap_or("localhost").to_string())
        } else {
            None
        };

        Self::connect_internal(Arc::clone(self), address, tls_domain).await
    }

    async fn connect_internal(
        client: Arc<Self>,
        address: String,
        tls_domain: Option<String>,
    ) -> SocketResult<()> {
        if client.is_connected().await {
            return Err(SocketError::AlreadyConnected.into());
        }

        log::info!(
            "Connecting to {} (Mode: {})",
            address,
            if tls_domain.is_some() {
                "TLS Server"
            } else {
                "DIRECT"
            }
        );

        let tcp_stream = time::timeout(Duration::from_secs(10), TcpStream::connect(&address))
            .await
            .map_err(|_| SocketError::Timeout)
            .with_context(|| format!("connecting to {}", address))?
            .with_context(|| format!("establishing TCP connection to {}", address))?;

        let socket_stream = match tls_domain {
            Some(domain) => {
                log::info!("Upgrading to TLS (Domain: {})...", domain);

                let mut root_store = rustls::RootCertStore::empty();
                for cert in
                    rustls_native_certs::load_native_certs().expect("could not load platform certs")
                {
                    root_store.add(cert).unwrap();
                }

                let config = if let Some(fingerprint) = &client.config.fingerprint {
                    log::info!("Using fingerprint verification: {}", fingerprint);
                    let tls_config = load_certificates(fingerprint.to_string()).unwrap();

                    tls_config
                } else {
                    log::info!("Using system root certificates for TLS");
                    let tls_config = ClientConfig::builder()
                        .with_root_certificates(root_store)
                        .with_no_client_auth();
                    tls_config
                };

                let connector = TlsConnector::from(Arc::new(config));
                let dns_name = ServerName::try_from(domain)
                    .map_err(|_| SocketError::ConfigError("Invalid DNS name".into()))?;

                let tls_stream = connector
                    .connect(dns_name, tcp_stream)
                    .await
                    .with_context(|| "TLS handshake failed")?;

                SocketStream::Tls(tls_stream)
            }
            None => {
                log::debug!("Using plain TCP for LAN connection");
                SocketStream::Plain(tcp_stream)
            }
        };

        let conn_id = Uuid::new_v4().to_string();
        let (connection, mut incoming_rx) = Connection::new(conn_id, socket_stream);

        *client.connection.write().await = Some(Arc::clone(&connection));
        client.is_running.store(true, Ordering::SeqCst);
        client.register_builtin_handlers().await;

        let client_for_loop = Arc::clone(&client);
        tokio::spawn(async move {
            while let Some((packet_type, request_id, payload)) = incoming_rx.recv().await {
                client_for_loop
                    .handle_packet(packet_type, request_id, &payload)
                    .await;
            }

            let was_running = client_for_loop.is_running.swap(false, Ordering::SeqCst);
            *client_for_loop.connection.write().await = None;

            if was_running {
                log::warn!(
                    "Connection to {} lost",
                    client_for_loop.config.target_address
                );
            }
        });

        let client_for_heartbeat = Arc::clone(&client);
        tokio::spawn(async move {
            client_for_heartbeat.heartbeat_loop().await;
        });

        log::info!("Connected to {}", client.config.target_address);

        Ok(())
    }

    pub async fn disconnect(&self) {
        self.is_running.store(false, Ordering::SeqCst);

        if let Some(conn) = self.connection.write().await.take() {
            conn.close().await;
        }

        log::info!("Disconnected from {}", self.config.target_address);
    }

    pub async fn authenticate(&self, token: &str) -> SocketResult<bool> {
        let conn = self.get_connection().await?;

        let (tx, _rx) = oneshot::channel();
        *self.auth_response.lock().await = Some(tx);

        let response = conn
            .request(PacketType::AuthLoginRequest, |w| {
                w.write_string(token);
            })
            .await
            .with_context(|| "sending authentication request")?;

        let mut reader = super::binary::BinaryReader::new(&response);

        let result = match reader.read_u8() {
            Ok(1) => {
                let data = reader.read_string().unwrap_or_default();
                let user: UserInfo = match serde_json::from_str(&data) {
                    Ok(u) => u,
                    Err(e) => {
                        log::error!("Failed to parse user info JSON: {}", e);
                        serde_json::from_str(&data).unwrap_or_default()
                    }
                };

                let conn = self.connection.read().await.clone();
                if let Some(conn) = conn {
                    conn.set_authenticated(user.clone()).await;
                }

                log::info!("Authenticated as user: {}", user.name);
                Ok(true)
            }
            _ => {
                let reason = reader
                    .read_string()
                    .unwrap_or_else(|_| "Unknown error".to_string());
                log::error!("Authentication failed: {}", reason);

                Err(SocketError::auth_failed(reason).into())
            }
        };

        result
    }

    pub async fn revoke_token(&self, token: &str) -> SocketResult<()> {
        let conn = self.get_connection().await?;

        conn.send_packet(PacketType::AuthTokenRevoke, |w| {
            w.write_string(token);
        })
        .await
        .with_context(|| "sending revoke token packet")?;

        log::info!("Revoked token");

        Ok(())
    }

    pub async fn send_packet<F>(
        &self,
        packet_type: PacketType,
        payload_writer: F,
    ) -> SocketResult<i32>
    where
        F: FnOnce(&mut BinaryWriter),
    {
        let conn = self.get_connection().await?;
        conn.send_packet(packet_type, payload_writer)
            .await
            .with_context(|| format!("sending {:?} packet", packet_type))
    }

    async fn get_connection(&self) -> SocketResult<Arc<Connection>> {
        self.connection
            .read()
            .await
            .clone()
            .ok_or_else(|| SocketError::NotConnected.into())
    }

    async fn register_builtin_handlers(&self) {
        self.router
            .register(
                PacketType::SystemHandshake,
                |_conn, payload, _req_id| async move {
                    log::debug!("Received handshake payload: {:?}", payload);

                    Ok(())
                },
            )
            .await;

        self.router
            .register(
                PacketType::SystemHeartbeat,
                |conn, _payload, _req_id| async move {
                    conn.send_packet(PacketType::SystemHeartbeat, |_| {})
                        .await?;
                    Ok(())
                },
            )
            .await;
    }

    async fn handle_packet(&self, packet_type: PacketType, request_id: i32, payload: &[u8]) {
        if packet_type == PacketType::AuthLoginResponse {
            self.handle_auth_response(payload).await;
            return;
        }

        let conn = self.connection.read().await.clone();
        if let Some(conn) = conn {
            self.router
                .dispatch(packet_type, conn, payload, request_id)
                .await;
        }
    }

    async fn handle_auth_response(&self, payload: &[u8]) {
        use super::binary::BinaryReader;

        let mut reader = BinaryReader::new(payload);

        let result = match reader.read_u8() {
            Ok(1) => {
                let data = reader.read_string().unwrap_or_default();
                let user: UserInfo = match serde_json::from_str(&data) {
                    Ok(u) => u,
                    Err(e) => {
                        log::error!("Failed to parse user info JSON: {}", e);
                        serde_json::from_str(&data).unwrap_or_default()
                    }
                };

                let conn = self.connection.read().await.clone();
                if let Some(conn) = conn {
                    conn.set_authenticated(user.clone()).await;
                }

                log::info!("Authenticated as user: {}", user.name);
                Ok(user)
            }
            Ok(_) => {
                let reason = reader
                    .read_string()
                    .unwrap_or_else(|_| "Unknown error".to_string());
                log::error!("Authentication failed: {}", reason);

                Err(SocketError::auth_failed(reason).into())
            }
            Err(e) => Err(e),
        };

        if let Some(tx) = self.auth_response.lock().await.take() {
            let _ = tx.send(result);
        }
    }

    async fn heartbeat_loop(&self) {
        let mut interval = time::interval(Duration::from_secs(15));

        while self.is_running.load(Ordering::SeqCst) {
            interval.tick().await;

            if !self.is_authenticated().await {
                continue;
            }

            let conn = self.connection.read().await.clone();
            if let Some(conn) = conn {
                if let Err(e) = conn.send_packet(PacketType::SystemHeartbeat, |_| {}).await {
                    log::warn!("Failed to send heartbeat: {:#}", e);
                    break;
                }
            } else {
                break;
            }
        }
    }
}

impl std::fmt::Debug for SocketClient {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("SocketClient")
            .field("address", &self.config.target_address)
            .field("is_running", &self.is_running.load(Ordering::SeqCst))
            .finish()
    }
}

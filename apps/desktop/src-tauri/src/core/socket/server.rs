use rustls::pki_types::{CertificateDer, PrivateKeyDer, PrivatePkcs8KeyDer};
use rustls::ServerConfig;
use socket2::{Domain, Protocol, Socket, Type};
use std::net::SocketAddr;
use std::sync::atomic::{AtomicBool, AtomicU16, Ordering};
use std::sync::Arc;
use std::sync::Mutex;
use std::time::Duration;
use tokio::net::TcpListener;
use tokio::sync::mpsc;
use tokio::time;
use tokio_rustls::TlsAcceptor;
use uuid::Uuid;

use crate::core::device::DeviceManager;
use crate::core::socket::stream::SocketStream;
use crate::core::socket::tls::FingerprintVerifier;
use crate::state::GlobalState;

use super::binary::BinaryWriter;
use super::connection::Connection;
use super::error::{SocketError, SocketResult};
use super::protocol::PacketType;
use super::router::PacketRouter;

#[derive(Debug, Clone)]
pub struct ConnectionServerConfig {
    pub connection_timeout_secs: u64,
    pub idle_timeout_secs: u64,
    pub bind_address: String,
}

impl Default for ConnectionServerConfig {
    fn default() -> Self {
        Self {
            connection_timeout_secs: 30,
            idle_timeout_secs: 300,
            bind_address: "0.0.0.0:0".to_string(),
        }
    }
}

#[derive(Debug, Clone)]
pub enum ConnectionEvent {
    Connected {
        id: String,
        address: String,
    },
    Disconnected {
        id: String,
        reason: String,
    },
    DataReceived {
        id: String,
        packet_type: PacketType,
        data: Vec<u8>,
    },
}

pub struct SocketServer {
    config: ConnectionServerConfig,
    tls_acceptor: Option<TlsAcceptor>,
    router: Arc<PacketRouter>,
    pub connection: Mutex<Option<Arc<Connection>>>,
    is_running: AtomicBool,
    listening_port: AtomicU16,
    event_tx: Option<mpsc::Sender<ConnectionEvent>>,
    on_connection: Option<Arc<dyn Fn(Arc<Connection>, String) + Send + Sync>>,
}

impl SocketServer {
    pub fn new(expected_fingerprint: String) -> Arc<Self> {
        Self::with_config(expected_fingerprint, ConnectionServerConfig::default())
    }

    pub fn with_config(expected_fingerprint: String, config: ConnectionServerConfig) -> Arc<Self> {
        let tls_acceptor = Self::create_tls_acceptor(expected_fingerprint.clone()).ok();

        Arc::new(Self {
            config,
            tls_acceptor,
            router: Arc::new(PacketRouter::new()),
            connection: Mutex::new(None),
            is_running: AtomicBool::new(false),
            listening_port: AtomicU16::new(0),
            event_tx: None,
            on_connection: None,
        })
    }

    pub fn with_events(
        expected_fingerprint: String,
        event_tx: mpsc::Sender<ConnectionEvent>,
    ) -> Arc<Self> {
        let tls_acceptor = Self::create_tls_acceptor(expected_fingerprint.clone()).ok();
        Arc::new(Self {
            config: ConnectionServerConfig::default(),
            tls_acceptor,
            router: Arc::new(PacketRouter::new()),
            connection: Mutex::new(None),
            is_running: AtomicBool::new(false),
            listening_port: AtomicU16::new(0),
            event_tx: Some(event_tx),
            on_connection: None,
        })
    }

    pub fn set_connection_handler<F>(&mut self, handler: F)
    where
        F: Fn(Arc<Connection>, String) + Send + Sync + 'static,
    {
        self.on_connection = Some(Arc::new(handler));
    }

    pub fn port(&self) -> u16 {
        self.listening_port.load(Ordering::SeqCst)
    }

    fn create_tls_acceptor(fingerprint: String) -> SocketResult<TlsAcceptor> {
        let device_manager = GlobalState::get::<DeviceManager>();
        let key_info = device_manager
            .key()
            .map_err(|e| SocketError::config(format!("Failed to get device key for TLS: {}", e)))?;

        let cert_der = CertificateDer::from(key_info.cert_der);
        let key_der = PrivateKeyDer::Pkcs8(PrivatePkcs8KeyDer::from(key_info.key_der));

        let verifier = Arc::new(FingerprintVerifier::new(fingerprint)?);

        let server_config =
            ServerConfig::builder_with_protocol_versions(&[&rustls::version::TLS13])
                .with_client_cert_verifier(verifier)
                .with_single_cert(vec![cert_der], key_der)
                .map_err(|e| SocketError::config(format!("TLS config failed: {}", e)))?;

        Ok(TlsAcceptor::from(Arc::new(server_config)))
    }

    pub fn listening_port(&self) -> u16 {
        self.listening_port.load(Ordering::SeqCst)
    }

    pub fn is_running(&self) -> bool {
        self.is_running.load(Ordering::SeqCst)
    }

    pub fn has_active_connection(&self) -> bool {
        match self.connection.lock() {
            Ok(lock) => lock
                .as_ref()
                .map(|conn| !conn.is_closing())
                .unwrap_or(false),
            Err(_) => false,
        }
    }

    pub async fn start(self: &Arc<Self>) -> SocketResult<u16> {
        if self.is_running.load(Ordering::SeqCst) {
            return Ok(self.listening_port.load(Ordering::SeqCst));
        }

        crate::core::socket::register_all_handlers(&self.router).await;
        log::info!("Registered all packet handlers");

        let listener = self.create_listener().await?;
        let local_addr = listener.local_addr()?;
        let port = local_addr.port();

        self.listening_port.store(port, Ordering::SeqCst);
        self.is_running.store(true, Ordering::SeqCst);

        log::info!("Server listening on {}", local_addr);

        let server = Arc::clone(self);
        tokio::spawn(async move {
            server.accept_one_shot(listener).await;
        });

        Ok(port)
    }

    async fn create_listener(&self) -> SocketResult<TcpListener> {
        let addr: SocketAddr = self
            .config
            .bind_address
            .parse()
            .map_err(|e| SocketError::config(format!("Invalid bind address: {}", e)))?;
        let domain = if addr.is_ipv4() {
            Domain::IPV4
        } else {
            Domain::IPV6
        };
        let socket = Socket::new(domain, Type::STREAM, Some(Protocol::TCP))?;

        socket.set_nonblocking(true)?;
        socket.set_reuse_address(true)?;
        socket.bind(&addr.into())?;
        socket.listen(1)?;

        Ok(TcpListener::from_std(socket.into())?)
    }

    async fn accept_one_shot(self: Arc<Self>, listener: TcpListener) {
        let timeout_duration = Duration::from_secs(self.config.connection_timeout_secs);

        log::info!(
            "Waiting for incoming connection... (timeout: {:?})",
            timeout_duration
        );

        let accept_result = time::timeout(timeout_duration, listener.accept()).await;

        self.listening_port.store(0, Ordering::SeqCst);
        self.is_running.store(false, Ordering::SeqCst);

        match accept_result {
            Ok(Ok((stream, addr))) => {
                log::info!("Accepted TCP connection from {}", addr);
                let server = self.clone();
                tokio::spawn(async move {
                    // Handle handshake
                    let socket_stream = if let Some(ref tls) = server.tls_acceptor {
                        match time::timeout(Duration::from_secs(5), tls.accept(stream)).await {
                            Ok(Ok(tls_stream)) => {
                                log::info!("TLS Handshake successful with {}", addr);
                                SocketStream::ServerTls(tls_stream)
                            }
                            Ok(Err(e)) => {
                                log::error!("TLS Handshake failed: {}", e);
                                return;
                            }
                            Err(_) => {
                                log::error!("TLS Handshake timed out with {}", addr);
                                return;
                            }
                        }
                    } else {
                        SocketStream::Plain(stream)
                    };

                    if let Err(e) = server.prepare_to_run(socket_stream).await {
                        log::error!("Connection handling failed: {}", e);
                    }
                });
            }
            Ok(Err(e)) => log::error!("Accept failed: {}", e),
            Err(_) => log::warn!("Connection timed out (No peer connected)"),
        }
    }

    async fn prepare_to_run(self: &Arc<Self>, socket_stream: SocketStream) -> SocketResult<()> {
        let conn_id = Uuid::new_v4().to_string();
        let (connection, incoming_rx) = Connection::new(conn_id.clone(), socket_stream);

        {
            match self.connection.lock() {
                Ok(mut lock) => *lock = Some(connection.clone()),
                Err(e) => log::error!("Failed to lock connection mutex: {}", e),
            }
        }

        log::info!("Starting packet processing loop for {}", conn_id);

        let router = self.router.clone();
        let event_tx = self.event_tx.clone();
        let config = self.config.clone();

        Self::run_connection_loop(connection, incoming_rx, router, event_tx, config).await;

        Ok(())
    }

    async fn run_connection_loop(
        connection: Arc<Connection>,
        mut incoming_rx: mpsc::Receiver<(PacketType, i32, Vec<u8>)>,
        router: Arc<PacketRouter>,
        event_tx: Option<mpsc::Sender<ConnectionEvent>>,
        config: ConnectionServerConfig,
    ) {
        let conn_id = connection.id().to_string();
        let idle_timeout = Duration::from_secs(config.idle_timeout_secs);
        let idle_sleep = time::sleep(idle_timeout);
        tokio::pin!(idle_sleep);

        log::info!("ENTERING Consumer Loop for {}", conn_id);

        loop {
            tokio::select! {
                _ = &mut idle_sleep => {
                    log::info!("Connection {} idle timeout", conn_id);
                    break;
                }
                maybe_packet = incoming_rx.recv() => {
                    match maybe_packet {
                        Some((packet_type, request_id, payload)) => {
                            idle_sleep.as_mut().reset(time::Instant::now() + idle_timeout);

                            let should_notify_ui = !matches!(packet_type, PacketType::FileChunk);
                            let display_data = if should_notify_ui {
                                if payload.len() > 1024 {
                                    Vec::new()
                                } else {
                                    payload.clone()
                                }
                            } else {
                                Vec::new()
                            };

                            router
                                .dispatch(packet_type, Arc::clone(&connection), payload, request_id)
                                .await;

                            if should_notify_ui {
                                if let Some(ref tx) = event_tx {
                                    if tx
                                        .try_send(ConnectionEvent::DataReceived {
                                            id: conn_id.clone(),
                                            packet_type,
                                            data: display_data,
                                        })
                                        .is_err()
                                    {
                                        log::debug!(
                                            "Dropping DataReceived event (channel full) for {}",
                                            conn_id
                                        );
                                    }
                                }
                            }

                            tokio::task::yield_now().await;
                        }
                        None => {
                            log::info!("Peer closed connection");
                            break;
                        }
                    }
                }
            }
        }

        log::info!("Closing connection {}", conn_id);
        connection.close().await;

        if let Some(ref tx) = event_tx {
            let _ = tx
                .send(ConnectionEvent::Disconnected {
                    id: conn_id,
                    reason: "Session ended".into(),
                })
                .await;
        }
    }

    fn shutdown_internal(&self) {
        self.is_running.store(false, Ordering::SeqCst);
        match self.connection.lock() {
            Ok(mut lock) => *lock = None,
            Err(e) => {
                log::error!("Failed to clear connection state: {}", e);
            }
        }
    }

    pub async fn stop(&self) {
        log::info!("Stopping server and closing connections...");
        self.is_running.store(false, Ordering::SeqCst);

        let connection_to_close = {
            match self.connection.lock() {
                Ok(mut lock) => lock.take(),
                Err(e) => {
                    log::error!("Failed to acquire lock for shutdown: {}", e);
                    None
                }
            }
        };

        if let Some(conn) = connection_to_close {
            log::debug!("Closing active connection: {}", conn.id());
            conn.close().await;
        }

        self.listening_port.store(0, Ordering::SeqCst);
    }

    pub async fn send(
        &self,
        packet_type: PacketType,
        data_writer: impl FnOnce(&mut BinaryWriter),
    ) -> SocketResult<()> {
        let connection_guard = self
            .connection
            .lock()
            .map_err(|_| SocketError::server("Connection lock poisoned"))?;

        if let Some(conn) = connection_guard.as_ref() {
            conn.send_packet(packet_type, data_writer).await?;
            Ok(())
        } else {
            Err(SocketError::NotConnected.into())
        }
    }
}

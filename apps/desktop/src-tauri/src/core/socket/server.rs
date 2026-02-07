use rustls::pki_types::{CertificateDer, PrivateKeyDer, PrivatePkcs8KeyDer};
use rustls::ServerConfig;
use socket2::{Domain, Protocol, Socket, Type};
use std::net::SocketAddr;
use std::sync::atomic::{AtomicBool, AtomicU16, Ordering};
use std::sync::Arc;
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::mpsc;
use tokio::time;
use tokio_rustls::TlsAcceptor;
use uuid::Uuid;

use crate::core::device::DeviceManager;
use crate::core::socket::stream::SocketStream;
use crate::core::socket::sys::register_system_handlers;
use crate::core::socket::tls::FingerprintVerifier;
use crate::state::GlobalState;

use super::binary::BinaryWriter;
use super::connection::Connection;
use super::error::{Context, SocketError, SocketResult};
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
        })
    }

    fn create_tls_acceptor(fingerprint: String) -> SocketResult<TlsAcceptor> {
        let device_manager = GlobalState::get::<DeviceManager>();
        let key_info = device_manager.key().context("Failed to get device key")?;

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

    pub async fn start(self: &Arc<Self>) -> SocketResult<u16> {
        if self.is_running.load(Ordering::SeqCst) {
            return Ok(self.listening_port());
        }

        let listener = self.create_listener().await?;
        let local_addr = listener
            .local_addr()
            .context("Failed to get local address")?;
        let port = local_addr.port();

        self.listening_port.store(port, Ordering::SeqCst);
        self.is_running.store(true, Ordering::SeqCst);

        log::info!("Waiting for file transfer from peer on port {}", port);

        register_system_handlers(&self.router).await;

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

        log::debug!(
            "Waiting for incoming connection... (timeout: {:?})",
            timeout_duration
        );

        let accept_result = time::timeout(timeout_duration, listener.accept()).await;

        drop(listener);
        self.listening_port.store(0, Ordering::SeqCst);

        match accept_result {
            Ok(Ok((stream, addr))) => {
                log::info!("Accepted connection from {}. Port closed.", addr);
                if let Err(e) = self.handle_handshake_and_run(stream, addr).await {
                    log::error!("Connection handling failed: {}", e);
                    self.shutdown_internal();
                }
            }
            Ok(Err(e)) => {
                log::error!("Accept failed: {}", e);
                self.shutdown_internal();
            }
            Err(_) => {
                log::warn!("Connection timed out (Sender did not connect in time)");
                self.shutdown_internal();
            }
        }
    }

    async fn handle_handshake_and_run(
        self: &Arc<Self>,
        stream: TcpStream,
        addr: SocketAddr,
    ) -> SocketResult<()> {
        let socket_stream = if let Some(ref tls) = self.tls_acceptor {
            match time::timeout(Duration::from_secs(5), tls.accept(stream)).await {
                Ok(Ok(tls_stream)) => {
                    log::info!("TLS Handshake successful with {}", addr);
                    SocketStream::ServerTls(tls_stream)
                }
                Ok(Err(e)) => {
                    return Err(SocketError::server(format!("TLS Handshake failed: {}", e)).into());
                }
                Err(_) => {
                    return Err(SocketError::Timeout.into());
                }
            }
        } else {
            SocketStream::Plain(stream)
        };

        let conn_id = Uuid::new_v4().to_string();
        let (connection, incoming_rx) = Connection::new(conn_id.clone(), socket_stream);

        {
            let mut conn_lock = self
                .connection
                .lock()
                .map_err(|_| SocketError::server("Connection lock poisoned"))?;

            *conn_lock = Some(Arc::clone(&connection));
        }

        if let Some(ref tx) = self.event_tx {
            let _ = tx
                .send(ConnectionEvent::Connected {
                    id: conn_id.clone(),
                    address: addr.to_string(),
                })
                .await;
        }

        self.process_connection(connection, incoming_rx).await;
        Ok(())
    }

    async fn process_connection(
        self: &Arc<Self>,
        connection: Arc<Connection>,
        mut incoming_rx: mpsc::Receiver<(PacketType, i32, Vec<u8>)>,
    ) {
        let conn_id = connection.id().to_string();
        let idle_timeout = Duration::from_secs(self.config.idle_timeout_secs);
        let mut last_activity = Instant::now();

        log::info!("Processing data for connection: {}", conn_id);

        loop {
            if !self.is_running.load(Ordering::SeqCst) {
                break;
            }

            if last_activity.elapsed() > idle_timeout {
                log::info!("Connection idle timeout");
                break;
            }

            match time::timeout(Duration::from_secs(5), incoming_rx.recv()).await {
                Ok(Some((packet_type, request_id, payload))) => {
                    last_activity = Instant::now();

                    self.router
                        .dispatch(packet_type, Arc::clone(&connection), &payload, request_id)
                        .await;

                    if let Some(ref tx) = self.event_tx {
                        let _ = tx
                            .send(ConnectionEvent::DataReceived {
                                id: conn_id.clone(),
                                packet_type,
                                data: payload,
                            })
                            .await;
                    }
                }
                Ok(None) => {
                    log::info!("Peer closed connection");
                    break;
                }
                Err(_) => {
                    continue;
                }
            }
        }

        connection.close().await;
        self.shutdown_internal();

        if let Some(ref tx) = self.event_tx {
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

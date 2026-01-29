use std::io;
use thiserror::Error;

pub use anyhow::{anyhow, Context, Result};

pub type SocketResult<T> = anyhow::Result<T>;

#[derive(Error, Debug)]
pub enum SocketError {
    #[error("IO error: {0}")]
    Io(#[from] io::Error),
    #[error("Connection closed")]
    ConnectionClosed,
    #[error("Connection timed out")]
    Timeout,
    #[error("Parse error: {0}")]
    ParseError(String),
    #[error("Authentication failed: {0}")]
    AuthenticationFailed(String),
    #[error("Not connected to server")]
    NotConnected,
    #[error("Already connected")]
    AlreadyConnected,
    #[error("Invalid packet type: 0x{0:02X}")]
    InvalidPacketType(u8),
    #[error("Packet too large: {0} bytes")]
    PacketTooLarge(usize),
    #[error("Server error: {0}")]
    ServerError(String),
    #[error("Channel error: {0}")]
    ChannelError(String),
    #[error("Configuration error: {0}")]
    ConfigError(String),
    #[error("Send failed: {0}")]
    SendFailed(String),
}

impl SocketError {
    pub fn parse(msg: impl Into<String>) -> Self {
        Self::ParseError(msg.into())
    }

    pub fn server(msg: impl Into<String>) -> Self {
        Self::ServerError(msg.into())
    }

    pub fn config(msg: impl Into<String>) -> Self {
        Self::ConfigError(msg.into())
    }

    pub fn auth_failed(reason: impl Into<String>) -> Self {
        Self::AuthenticationFailed(reason.into())
    }
}

pub trait IoResultExt<T> {
    fn map_socket_io(self) -> SocketResult<T>;
}

impl<T> IoResultExt<T> for io::Result<T> {
    fn map_socket_io(self) -> SocketResult<T> {
        self.map_err(|e| {
            let socket_err = match e.kind() {
                io::ErrorKind::ConnectionReset
                | io::ErrorKind::ConnectionAborted
                | io::ErrorKind::BrokenPipe => SocketError::ConnectionClosed,
                io::ErrorKind::TimedOut => SocketError::Timeout,
                _ => SocketError::Io(e),
            };
            anyhow::Error::from(socket_err)
        })
    }
}

pub trait SocketResultExt<T> {
    fn with_connection_context(self, conn_id: &str) -> SocketResult<T>;

    fn with_packet_context(self, packet_type: &str) -> SocketResult<T>;
}

impl<T, E: Into<anyhow::Error>> SocketResultExt<T> for Result<T, E> {
    fn with_connection_context(self, conn_id: &str) -> SocketResult<T> {
        self.map_err(|e| e.into())
            .with_context(|| format!("connection '{}'", conn_id))
    }

    fn with_packet_context(self, packet_type: &str) -> SocketResult<T> {
        self.map_err(|e| e.into())
            .with_context(|| format!("processing packet '{}'", packet_type))
    }
}

impl<T> From<tokio::sync::mpsc::error::SendError<T>> for SocketError {
    fn from(err: tokio::sync::mpsc::error::SendError<T>) -> Self {
        SocketError::ChannelError(err.to_string())
    }
}

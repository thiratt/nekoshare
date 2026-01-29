use std::pin::Pin;
use std::task::{Context, Poll};
use tokio::io::{AsyncRead, AsyncWrite, ReadBuf};
use tokio::net::TcpStream;
use tokio_rustls::client::TlsStream as ClientTlsStream;
use tokio_rustls::server::TlsStream as ServerTlsStream;

#[derive(Debug)]
pub enum SocketStream {
    Plain(TcpStream),
    Tls(ClientTlsStream<TcpStream>),
    ServerTls(ServerTlsStream<TcpStream>),
}

impl AsyncRead for SocketStream {
    fn poll_read(
        self: Pin<&mut Self>,
        cx: &mut Context<'_>,
        buf: &mut ReadBuf<'_>,
    ) -> Poll<std::io::Result<()>> {
        match self.get_mut() {
            SocketStream::Plain(s) => Pin::new(s).poll_read(cx, buf),
            SocketStream::Tls(s) => Pin::new(s).poll_read(cx, buf),
            SocketStream::ServerTls(s) => Pin::new(s).poll_read(cx, buf),
        }
    }
}

impl AsyncWrite for SocketStream {
    fn poll_write(
        self: Pin<&mut Self>,
        cx: &mut Context<'_>,
        buf: &[u8],
    ) -> Poll<std::io::Result<usize>> {
        match self.get_mut() {
            SocketStream::Plain(s) => Pin::new(s).poll_write(cx, buf),
            SocketStream::Tls(s) => Pin::new(s).poll_write(cx, buf),
            SocketStream::ServerTls(s) => Pin::new(s).poll_write(cx, buf),
        }
    }

    fn poll_flush(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<std::io::Result<()>> {
        match self.get_mut() {
            SocketStream::Plain(s) => Pin::new(s).poll_flush(cx),
            SocketStream::Tls(s) => Pin::new(s).poll_flush(cx),
            SocketStream::ServerTls(s) => Pin::new(s).poll_flush(cx),
        }
    }

    fn poll_shutdown(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<std::io::Result<()>> {
        match self.get_mut() {
            SocketStream::Plain(s) => Pin::new(s).poll_shutdown(cx),
            SocketStream::Tls(s) => Pin::new(s).poll_shutdown(cx),
            SocketStream::ServerTls(s) => Pin::new(s).poll_shutdown(cx),
        }
    }
}

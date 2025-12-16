use tokio::net::TcpStream;
use tokio::io::AsyncWriteExt;
use std::error::Error;

pub struct NekoSocket {
    stream: Option<TcpStream>,
}

impl NekoSocket {
    pub fn new() -> Self {
        NekoSocket { stream: None }
    }

    pub async fn connect(&mut self, addr: String) -> Result<(), Box<dyn Error>> {
        let stream = TcpStream::connect(addr).await?;
        self.stream = Some(stream);
        Ok(())
    }

    pub async fn send_data(&mut self, data: &[u8]) -> Result<(), Box<dyn Error>> {
        if let Some(stream) = &mut self.stream {
            stream.write_all(data).await?;
            Ok(())
        } else {
            Err("Not connected".into())
        }
    }

    pub async fn disconnect(&mut self) -> Result<(), Box<dyn Error>> {
        self.stream = None;
        Ok(())
    }

    pub fn is_connected(&self) -> bool {
        self.stream.is_some()
    }
}
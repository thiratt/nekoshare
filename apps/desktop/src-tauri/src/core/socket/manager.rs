use std::{collections::HashMap, sync::Arc};

use tokio::sync::{mpsc, RwLock};
use uuid::Uuid;

use crate::{
    config::constants::SOCKET_SERVER_ENDPOINT,
    core::socket::{
        ids::LinkKey, ConnectionEvent, SocketClient, SocketClientConfig, SocketError, SocketResult,
        SocketServer,
    },
};

pub struct SocketServerManager {
    servers: RwLock<HashMap<String, Arc<SocketServer>>>,
    event_tx: Option<mpsc::Sender<ConnectionEvent>>,
}

pub struct SocketClientManager {
    server_client: RwLock<Option<Arc<SocketClient>>>,
    clients: RwLock<HashMap<LinkKey, Arc<SocketClient>>>,
}

impl SocketServerManager {
    pub fn new() -> Self {
        Self {
            servers: RwLock::new(HashMap::new()),
            event_tx: None,
        }
    }

    pub fn with_events(tx: mpsc::Sender<ConnectionEvent>) -> Self {
        Self {
            servers: RwLock::new(HashMap::new()),
            event_tx: Some(tx),
        }
    }

    pub async fn create_server(&self, id: String, fingerprint: String) -> SocketResult<u16> {
        {
            let mut servers = self.servers.write().await;
            servers.retain(|_, s| {
                if s.is_running() {
                    return true;
                }
                match s.connection.lock() {
                    Ok(lock) => lock.is_some(),
                    Err(_) => false,
                }
            });
        }

        let server = if let Some(ref tx) = self.event_tx {
            SocketServer::with_events(fingerprint, tx.clone())
        } else {
            SocketServer::new(fingerprint)
        };

        let port = server.start().await?;

        self.servers.write().await.insert(id, server);
        Ok(port)
    }

    pub async fn stop_server(&self, id: &str) {
        if let Some(server) = self.servers.write().await.remove(id) {
            server.stop().await;
        }
    }
}

impl SocketClientManager {
    pub fn new() -> Self {
        Self {
            server_client: RwLock::new(None),
            clients: RwLock::new(HashMap::new()),
        }
    }

    pub async fn connect(
        &self,
        device_id: String,
        token: String,
    ) -> SocketResult<Arc<SocketClient>> {
        if let Some(existing) = self.server_client.read().await.clone() {
            if existing.is_connected().await && existing.is_authenticated().await {
                existing.revoke_token(&token).await?;
                return Ok(existing);
            }

            if existing.is_connected().await && !existing.is_authenticated().await {
                let ok = existing.authenticate(&token).await?;
                if ok {
                    return Ok(existing);
                } else {
                    return Err(SocketError::auth_failed("invalid token").into());
                }
            }
        }

        #[cfg(debug_assertions)]
        let config =
            SocketClientConfig::new(device_id, SOCKET_SERVER_ENDPOINT.to_string()).with_tls(false);
        #[cfg(not(debug_assertions))]
        let config = SocketClientConfig::new(device_id, SOCKET_SERVER_ENDPOINT.to_string());

        let client = SocketClient::new(config);
        client.connect().await?;

        let ok = client.authenticate(&token).await?;
        if !ok {
            client.disconnect().await;
            return Err(SocketError::auth_failed("invalid token").into());
        }

        *self.server_client.write().await = Some(client.clone());
        Ok(client)
    }

    pub async fn connect_to(&self, config: SocketClientConfig) -> SocketResult<Arc<SocketClient>> {
        let local = Uuid::parse_str(&config.device_id)
            .map_err(|_| SocketError::parse("device_id must be a valid UUID"))?;
        let target_id = config
            .target_id
            .as_ref()
            .ok_or_else(|| SocketError::parse("target_id is required"))?;

        let peer = Uuid::parse_str(target_id)
            .map_err(|_| SocketError::parse("target_id must be a valid UUID"))?;
        let link = LinkKey::direct(local, peer);

        {
            let clients = self.clients.read().await;
            if let Some(client) = clients.get(&link) {
                if client.is_connected().await {
                    return Ok(client.clone());
                }
            }
        }

        let client = SocketClient::new(config.clone());
        client.connect().await?;

        self.clients.write().await.insert(link, client.clone());
        Ok(client)
    }

    pub async fn get_client(&self, link: LinkKey) -> Option<Arc<SocketClient>> {
        self.clients.read().await.get(&link).cloned()
    }

    pub async fn is_connected_to_server(&self) -> bool {
        if let Some(client) = self.server_client.read().await.clone() {
            return client.is_connected().await && client.is_authenticated().await;
        }
        false
    }

    pub async fn disconnect(&self, link: LinkKey) {
        if let Some(client) = self.clients.write().await.remove(&link) {
            client.disconnect().await;
        }
    }

    pub async fn disconnect_from_server(&self) {
        if let Some(client) = self.server_client.write().await.take() {
            client.disconnect().await;
        }
    }
}

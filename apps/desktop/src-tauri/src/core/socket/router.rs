use std::collections::HashMap;
use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;
use tokio::sync::RwLock;

use super::connection::Connection;
use super::error::SocketResult;
use super::protocol::PacketType;

pub type PacketHandler = Arc<
    dyn Fn(Arc<Connection>, Vec<u8>, i32) -> Pin<Box<dyn Future<Output = SocketResult<()>> + Send>>
        + Send
        + Sync,
>;

pub struct PacketRouter {
    handlers: RwLock<HashMap<PacketType, PacketHandler>>,
    default_handler: RwLock<Option<PacketHandler>>,
}

impl PacketRouter {
    pub fn new() -> Self {
        Self {
            handlers: RwLock::new(HashMap::new()),
            default_handler: RwLock::new(None),
        }
    }

    pub async fn register<F, Fut>(&self, packet_type: PacketType, handler: F)
    where
        F: Fn(Arc<Connection>, Vec<u8>, i32) -> Fut + Send + Sync + 'static,
        Fut: Future<Output = SocketResult<()>> + Send + 'static,
    {
        let boxed_handler: PacketHandler =
            Arc::new(move |conn, payload, req_id| Box::pin(handler(conn, payload, req_id)));
        self.handlers
            .write()
            .await
            .insert(packet_type, boxed_handler);
    }

    pub async fn set_default_handler<F, Fut>(&self, handler: F)
    where
        F: Fn(Arc<Connection>, Vec<u8>, i32) -> Fut + Send + Sync + 'static,
        Fut: Future<Output = SocketResult<()>> + Send + 'static,
    {
        let boxed_handler: PacketHandler =
            Arc::new(move |conn, payload, req_id| Box::pin(handler(conn, payload, req_id)));
        *self.default_handler.write().await = Some(boxed_handler);
    }

    pub async fn has_handler(&self, packet_type: PacketType) -> bool {
        self.handlers.read().await.contains_key(&packet_type)
    }

    pub async fn dispatch(
        &self,
        packet_type: PacketType,
        connection: Arc<Connection>,
        payload: &[u8],
        request_id: i32,
    ) -> bool {
        let payload_owned = payload.to_vec();

        let handler = {
            let handlers = self.handlers.read().await;
            handlers.get(&packet_type).cloned()
        };

        if let Some(handler) = handler {
            if let Err(e) = handler(connection, payload_owned, request_id).await {
                log::error!("Handler error for {:?}: {}", packet_type, e);
            }
            return true;
        }

        let default_handler = {
            let default = self.default_handler.read().await;
            default.clone()
        };

        if let Some(handler) = default_handler {
            if let Err(e) = handler(connection, payload_owned, request_id).await {
                log::error!("Default handler error for {:?}: {}", packet_type, e);
            }
            return true;
        }

        log::warn!("No handler registered for {:?}", packet_type);
        false
    }

    pub async fn unregister(&self, packet_type: PacketType) -> bool {
        self.handlers.write().await.remove(&packet_type).is_some()
    }

    pub async fn clear(&self) {
        self.handlers.write().await.clear();
        *self.default_handler.write().await = None;
    }
}

impl Default for PacketRouter {
    fn default() -> Self {
        Self::new()
    }
}

impl std::fmt::Debug for PacketRouter {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("PacketRouter").finish()
    }
}

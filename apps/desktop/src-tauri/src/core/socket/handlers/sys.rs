use std::sync::Arc;

use crate::core::socket::{Connection, PacketRouter, PacketType, SocketResult};

async fn handle_heartbeat(conn: Arc<Connection>) -> SocketResult<()> {
    let _ = conn.send_packet(PacketType::SystemHeartbeat, |_| {}).await;
    Ok(())
}

pub async fn register_system_handlers(router: &PacketRouter) {
    router
        .register(PacketType::SystemHeartbeat, |conn, _payload, _req_id| {
            handle_heartbeat(conn)
        })
        .await;
}

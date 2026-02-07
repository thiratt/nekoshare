pub mod file;
pub mod sys;

pub use file::register_file_handlers;
pub use sys::register_system_handlers;

use crate::core::socket::PacketRouter;

pub async fn register_all_handlers(router: &PacketRouter) {
    register_system_handlers(router).await;
    register_file_handlers(router).await;
}

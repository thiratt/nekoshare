#[cfg(debug_assertions)]
pub mod constants {
    pub const API_SERVER_ENDPOINT: &str = "http://localhost:7780";
    pub const SOCKET_SERVER_ENDPOINT: &str = "127.0.0.1:7781";
}

#[cfg(not(debug_assertions))]
pub mod constants {
    pub const API_SERVER_ENDPOINT: &str = "replace_with_production_endpoint";
    pub const SOCKET_SERVER_ENDPOINT: &str = "replace_with_production_endpoint";
}

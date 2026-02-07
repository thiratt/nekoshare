#[derive(Debug, Clone)]
pub struct SocketClientConfig {
    pub device_id: String,
    pub target_id: Option<String>,
    pub target_address: String,
    pub use_tls: bool,
    pub fingerprint: Option<String>,
}

impl SocketClientConfig {
    pub fn new(device_id: String, target_address: String) -> Self {
        Self {
            device_id,
            target_id: None,
            target_address,
            use_tls: true,
            fingerprint: None,
        }
    }

    pub fn with_target_id(mut self, target_id: String) -> Self {
        self.target_id = Some(target_id);
        self
    }

    pub fn with_tls(mut self, enabled: bool) -> Self {
        log::warn!("'with_tls' is always enabled by default. If you disable it, make sure what you are doing.");
        self.use_tls = enabled;
        self
    }

    pub fn with_fingerprint(mut self, fingerprint: String) -> Self {
        self.fingerprint = Some(fingerprint);

        if !self.use_tls {
            log::warn!("TLS automatically enabled when setting a fingerprint.");
        }

        self.use_tls = true;

        self
    }
}

#[derive(Debug, Clone)]
pub struct ServerConfig {
    pub host: String,
    pub port: u16,
}

impl ServerConfig {
    pub fn new() -> Self {
        Self {
            host: "0.0.0.0".to_string(),
            port: 0,
        }
    }

    pub fn bind_address(&self) -> String {
        format!("{}:{}", self.host, self.port)
    }
}

impl Default for ServerConfig {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Debug, Clone)]
pub struct TransferConfig {
    pub chunk_size: usize,
    pub write_buffer_size: usize,
    pub read_buffer_size: usize,
    pub flush_threshold: usize,
    pub flush_interval_ms: u64,
    pub tcp_nodelay: bool,
    pub preallocate_files: bool,
    pub sync_on_complete: bool,
    pub outgoing_channel_size: usize,
    pub incoming_channel_size: usize,
    pub max_in_flight_chunks: usize,
}

impl Default for TransferConfig {
    fn default() -> Self {
        Self::lan_optimized()
    }
}

impl TransferConfig {
    pub fn lan_optimized() -> Self {
        Self {
            chunk_size: 1024 * 1024,            // 1 MB
            write_buffer_size: 2 * 1024 * 1024, // 2 MB
            read_buffer_size: 2 * 1024 * 1024,  // 2 MB
            flush_threshold: 4 * 1024 * 1024,   // 4 MB
            flush_interval_ms: 50,              // 50 ms
            tcp_nodelay: true,
            preallocate_files: false,
            sync_on_complete: true,
            outgoing_channel_size: 64,
            incoming_channel_size: 64,
            max_in_flight_chunks: 8,
        }
    }

    pub fn low_memory() -> Self {
        Self {
            chunk_size: 256 * 1024,        // 256 KB
            write_buffer_size: 256 * 1024, // 256 KB
            read_buffer_size: 256 * 1024,  // 256 KB
            flush_threshold: 512 * 1024,   // 512 KB
            flush_interval_ms: 100,        // 100 ms
            tcp_nodelay: true,
            preallocate_files: false,
            sync_on_complete: false,
            outgoing_channel_size: 16,
            incoming_channel_size: 16,
            max_in_flight_chunks: 2,
        }
    }

    pub fn wan_optimized() -> Self {
        Self {
            chunk_size: 64 * 1024,         // 64 KB
            write_buffer_size: 512 * 1024, // 512 KB
            read_buffer_size: 512 * 1024,  // 512 KB
            flush_threshold: 256 * 1024,   // 256 KB
            flush_interval_ms: 200,        // 200 ms
            tcp_nodelay: false,
            preallocate_files: true,
            sync_on_complete: true,
            outgoing_channel_size: 128,
            incoming_channel_size: 128,
            max_in_flight_chunks: 32,
        }
    }

    pub fn global() -> Self {
        Self::default()
    }
}

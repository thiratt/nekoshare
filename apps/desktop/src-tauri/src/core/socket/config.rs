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

        if self.use_tls == true {
            log::warn!("With fingerprint is provided TLS feature. Please remove 'with_tls(true)' setting to avoid conflicts.");
        } else {
            self.use_tls = true;
        }

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

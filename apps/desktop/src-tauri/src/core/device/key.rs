use std::fs;
use std::path::PathBuf;

use anyhow::Context;
use directories::ProjectDirs;
use log::{debug, info, warn};
use rcgen::{CertificateParams, KeyPair};
use sha2::{Sha256, Digest};

use super::error::{DeviceError, DeviceResult};

#[derive(Debug, Clone)]
pub struct KeyConfig {
    pub common_name: String,
    pub storage_dir: Option<PathBuf>,
}

impl Default for KeyConfig {
    fn default() -> Self {
        Self {
            common_name: "Nekoshare".to_string(),
            storage_dir: None,
        }
    }
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct KeyDer {
    pub cert_der: Vec<u8>,
    pub key_der: Vec<u8>,
    pub fingerprint: String,
}

impl KeyDer {
    pub fn new(cert_der: Vec<u8>, key_der: Vec<u8>) -> Self {
        let fingerprint = Self::compute_fingerprint(&cert_der);
        Self {
            cert_der,
            key_der,
            fingerprint,
        }
    }

    pub fn compute_fingerprint(cert_der: &[u8]) -> String {
        let mut hasher = Sha256::new();
        hasher.update(cert_der);
        let result = hasher.finalize();
        hex::encode(result)
    }
}

pub struct KeyManager {
    config: KeyConfig,
    base_path: PathBuf,
}

impl KeyManager {
    pub fn new(config: Option<KeyConfig>) -> DeviceResult<Self> {
        let config = config.unwrap_or_default();
        let qualifier = "com";
        let organization = "";
        let application = "Nekoshare";

        let root_dir = config.storage_dir.clone().unwrap_or_else(|| {
            ProjectDirs::from(qualifier, organization, application)
                .map(|p| p.data_local_dir().to_path_buf())
                .unwrap_or_else(|| {
                    warn!("Could not determine app data directory, using current directory");
                    PathBuf::from(".")
                })
        });

        let final_key_path = root_dir.join("key");

        if let Err(e) = fs::create_dir_all(&final_key_path) {
            warn!("Failed to create key directory {:?}: {}", final_key_path, e);
        }

        debug!("KeyManager initialized with path: {:?}", final_key_path);

        Ok(Self {
            config,
            base_path: final_key_path,
        })
    }

    pub fn get_or_create(&self, host: String) -> DeviceResult<KeyDer> {
        match self.load_certificates() {
            Ok((cert_der, key_der)) => {
                info!("Loaded existing certificates from {:?}", self.base_path);
                Ok(KeyDer::new(cert_der, key_der))
            }
            Err(e) => {
                debug!("Could not load certificates: {}, generating new ones", e);
                self.generate_certificates(host)
            }
        }
    }

    fn load_certificates(&self) -> DeviceResult<(Vec<u8>, Vec<u8>)> {
        let cert_der_path = self.base_path.join("cert.der");
        let key_der_path = self.base_path.join("key.der");

        if !cert_der_path.exists() || !key_der_path.exists() {
            return Err(DeviceError::certs_not_found(self.base_path.display().to_string()).into());
        }

        let cert_der = fs::read(&cert_der_path)
            .with_context(|| format!("Failed to read certificate from {:?}", cert_der_path))?;

        let key_der = fs::read(&key_der_path)
            .with_context(|| format!("Failed to read key from {:?}", key_der_path))?;

        debug!("Successfully loaded certificates from {:?}", self.base_path);
        Ok((cert_der, key_der))
    }

    pub fn generate_certificates(&self, host: String) -> DeviceResult<KeyDer> {
        info!("Generating new TLS certificates for host: {}", host);

        if !self.base_path.exists() {
            fs::create_dir_all(&self.base_path)
                .map_err(|e| DeviceError::storage_dir(self.base_path.display().to_string(), e))?;
            debug!("Created storage directory: {:?}", self.base_path);
        }

        let san_names = vec![host.clone(), self.config.common_name.clone()];
        let params = CertificateParams::new(san_names.clone()).map_err(|e| {
            DeviceError::cert_params(format!(
                "Failed to create certificate params for {:?}: {}",
                san_names, e
            ))
        })?;

        let key_pair = KeyPair::generate_for(&rcgen::PKCS_ED25519).map_err(|e| {
            DeviceError::key_gen(format!("Failed to generate Ed25519 key pair: {}", e))
        })?;

        debug!("Generated Ed25519 key pair");

        let cert = params.self_signed(&key_pair).map_err(|e| {
            DeviceError::cert_gen(format!("Failed to self-sign certificate: {}", e))
        })?;

        let pem_cert_path = self.base_path.join("cert.pem");
        let pem_key_path = self.base_path.join("key.pem");

        if let Err(e) = fs::write(&pem_cert_path, cert.pem()) {
            warn!(
                "Failed to write PEM certificate to {:?}: {}",
                pem_cert_path, e
            );
        }
        if let Err(e) = fs::write(&pem_key_path, key_pair.serialize_pem()) {
            warn!("Failed to write PEM key to {:?}: {}", pem_key_path, e);
        }

        let cert_der = cert.der().to_vec();
        let key_der = key_pair.serialize_der().to_vec();

        let der_cert_path = self.base_path.join("cert.der");
        let der_key_path = self.base_path.join("key.der");

        fs::write(&der_cert_path, &cert_der)
            .with_context(|| format!("Failed to write DER certificate to {:?}", der_cert_path))?;

        fs::write(&der_key_path, &key_der)
            .with_context(|| format!("Failed to write DER key to {:?}", der_key_path))?;

        let key_der_result = KeyDer::new(cert_der, key_der);

        info!(
            "Successfully generated and saved TLS certificates to {:?} (fingerprint: {})",
            self.base_path,
            key_der_result.fingerprint
        );

        Ok(key_der_result)
    }
}

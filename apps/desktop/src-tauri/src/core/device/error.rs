use std::io;
use thiserror::Error;

pub type DeviceResult<T> = anyhow::Result<T>;

#[derive(Error, Debug)]
pub enum DeviceError {
    #[error("Failed to retrieve machine ID: {0}")]
    MachineId(String),
    #[error("IO error during key operation: {0}")]
    Io(#[from] io::Error),
    #[error("Certificate parameter error: {0}")]
    CertificateParams(String),
    #[error("Key generation error: {0}")]
    KeyGeneration(String),
    #[error("Certificate generation error: {0}")]
    CertificateGeneration(String),
    #[error("Certificates not found at path: {path}")]
    CertificatesNotFound { path: String },
    #[error("Failed to create storage directory: {path}")]
    StorageDirectoryCreation { path: String, source: io::Error },
}

impl DeviceError {
    pub fn machine_id(reason: impl Into<String>) -> Self {
        Self::MachineId(reason.into())
    }

    pub fn cert_params(reason: impl Into<String>) -> Self {
        Self::CertificateParams(reason.into())
    }

    pub fn key_gen(reason: impl Into<String>) -> Self {
        Self::KeyGeneration(reason.into())
    }

    pub fn cert_gen(reason: impl Into<String>) -> Self {
        Self::CertificateGeneration(reason.into())
    }

    pub fn certs_not_found(path: impl Into<String>) -> Self {
        Self::CertificatesNotFound { path: path.into() }
    }

    pub fn storage_dir(path: impl Into<String>, source: io::Error) -> Self {
        Self::StorageDirectoryCreation {
            path: path.into(),
            source,
        }
    }
}

impl From<rcgen::Error> for DeviceError {
    fn from(err: rcgen::Error) -> Self {
        Self::CertificateParams(err.to_string())
    }
}

#[derive(Debug, serde::Serialize)]
pub struct CommandError {
    pub code: String,
    pub message: String,
    pub details: Option<String>,
}

impl CommandError {
    pub fn new(code: impl Into<String>, message: impl Into<String>) -> Self {
        Self {
            code: code.into(),
            message: message.into(),
            details: None,
        }
    }
}

impl From<DeviceError> for CommandError {
    fn from(err: DeviceError) -> Self {
        let code = match &err {
            DeviceError::MachineId(_) => "MACHINE_ID_ERROR",
            DeviceError::Io(_) => "IO_ERROR",
            DeviceError::CertificateParams(_) => "CERT_PARAMS_ERROR",
            DeviceError::KeyGeneration(_) => "KEY_GEN_ERROR",
            DeviceError::CertificateGeneration(_) => "CERT_GEN_ERROR",
            DeviceError::CertificatesNotFound { .. } => "CERTS_NOT_FOUND",
            DeviceError::StorageDirectoryCreation { .. } => "STORAGE_DIR_ERROR",
        };

        CommandError::new(code, err.to_string())
    }
}

impl From<anyhow::Error> for CommandError {
    fn from(err: anyhow::Error) -> Self {
        if let Some(device_err) = err.downcast_ref::<DeviceError>() {
            let mut cmd_err: CommandError = CommandError::from(device_err.to_string());

            let chain: Vec<String> = err.chain().skip(1).map(|e| e.to_string()).collect();
            if !chain.is_empty() {
                cmd_err.details = Some(chain.join(" -> "));
            }

            return cmd_err;
        }

        CommandError::new("UNKNOWN_ERROR", err.to_string())
    }
}

impl From<String> for CommandError {
    fn from(msg: String) -> Self {
        CommandError::new("ERROR", msg)
    }
}

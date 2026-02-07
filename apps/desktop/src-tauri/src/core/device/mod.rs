pub mod error;
pub mod info;
pub mod key;

pub use error::{CommandError, DeviceResult};
pub use key::{KeyDer, KeyManager};

use anyhow::Context;

use crate::core::device::info::{DeviceInfo, DeviceInfoManager};

#[derive(Debug, serde::Serialize)]
pub struct DeviceInfoWithKey {
    pub device_info: DeviceInfo,
    pub key: KeyDer,
    pub fingerprint: String,
}

#[derive(Debug, serde::Serialize)]
pub struct DeviceInfoWithFingerprint {
    pub device_info: DeviceInfo,
    pub fingerprint: String,
}

pub struct DeviceManager {
    device_info_manager: DeviceInfoManager,
    key_der: KeyDer,
}

impl DeviceManager {
    pub fn new() -> DeviceResult<Self> {
        let device_info_manager = DeviceInfoManager::new();
        let key_manager = KeyManager::new(None)
            .context("Failed to initialize key manager")?;

        let device_info = device_info_manager.info();
        let key_der = key_manager
            .get_or_create(device_info.ip.ipv4.clone())
            .context("Failed to get or create TLS certificates")?;

        Ok(Self {
            device_info_manager,
            key_der
        })
    }

    pub fn info(&self) -> DeviceResult<DeviceInfoWithFingerprint> {
        Ok(DeviceInfoWithFingerprint {
            device_info: self.device_info_manager.info(),
            fingerprint: self.key_der.fingerprint.clone(),
        })
    }

    pub fn key(&self) -> DeviceResult<KeyDer> {
        Ok(self.key_der.clone())
    }

    pub fn info_with_key(&self) -> DeviceResult<DeviceInfoWithKey> {
        Ok(DeviceInfoWithKey {
            device_info: self.device_info_manager.info(),
            key: self.key_der.clone(),
            fingerprint: self.key_der.fingerprint.clone(),
        })
    }
}
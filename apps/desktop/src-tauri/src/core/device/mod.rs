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

pub fn get_device_info_with_key() -> DeviceResult<DeviceInfoWithKey> {
    let device_info_manager = DeviceInfoManager::new();
    let device_info = device_info_manager.info();

    let key_manager = KeyManager::new(None).context("Failed to initialize key manager")?;

    let key = key_manager
        .get_or_create(device_info.ip.ipv4.clone())
        .context("Failed to get or create TLS certificates")?;

    let fingerprint = key.fingerprint.clone();

    Ok(DeviceInfoWithKey { 
        device_info, 
        key,
        fingerprint,
    })
}

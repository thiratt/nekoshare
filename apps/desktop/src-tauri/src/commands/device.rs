use crate::core::device::{CommandError, DeviceInfoWithKey, KeyDer, info::DeviceInfo};

#[tauri::command]
pub fn ns_get_device_info() -> DeviceInfo {
    let device_info_manager = crate::core::device::info::DeviceInfoManager::new();
    device_info_manager.info()
}

#[tauri::command]
pub fn ns_get_device_info_with_key() -> Result<DeviceInfoWithKey, CommandError> {
    crate::core::device::get_device_info_with_key().map_err(CommandError::from)
}

#[tauri::command]
pub fn ns_get_key() -> Result<KeyDer, CommandError> {
    let device_info_with_key =
        crate::core::device::get_device_info_with_key().map_err(CommandError::from)?;
    Ok(device_info_with_key.key)
}

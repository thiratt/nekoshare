use std::sync::Arc;
use crate::{
    core::device::{CommandError, DeviceInfoWithFingerprint, DeviceInfoWithKey, DeviceManager, KeyDer}, 
    state::GlobalState
};

fn get_manager() -> Arc<DeviceManager> {
    GlobalState::get::<DeviceManager>()
}

#[tauri::command]
pub async fn ns_get_device_info() -> Result<DeviceInfoWithFingerprint, CommandError> {
    let manager = get_manager();
    let info = manager.info().map_err(CommandError::from)?;

    Ok(info)
}

#[tauri::command]
pub fn ns_get_device_info_with_key() -> Result<DeviceInfoWithKey, CommandError> {
    let manager = get_manager();
    let info = manager.info_with_key().map_err(CommandError::from)?;

    Ok(info)
}

#[tauri::command]
pub fn ns_get_key() -> Result<KeyDer, CommandError> {
    let manager = get_manager();
    
    let key = manager.key().map_err(CommandError::from)?;

    Ok(key)
}
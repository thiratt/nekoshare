use crate::core::device::DeviceInfo;

#[tauri::command]
pub fn ns_get_device_info() -> DeviceInfo {
    crate::core::device::get_device_info()
}

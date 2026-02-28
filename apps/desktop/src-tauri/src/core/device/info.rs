use log::{debug, warn};
use sysinfo::System;
use std::net::UdpSocket;

use super::error::DeviceError;

#[derive(Debug, Clone, serde::Serialize)]
pub struct PlatformInfo {
    pub os: String,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct IpInfo {
    pub ipv4: String,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct DeviceInfo {
    pub id: String,
    pub name: String,
    pub platform: PlatformInfo,
    pub ip: IpInfo,
}

pub struct DeviceInfoManager;

impl DeviceInfoManager {
    pub fn new() -> Self {
        Self
    }

    pub fn info(&self) -> DeviceInfo {
        debug!("Gathering device information");

        DeviceInfo {
            id: self.machine_id(),
            name: self.host_name(),
            platform: self.platform_info(),
            ip: self.ip_info(),
        }
    }

    fn ip_info(&self) -> IpInfo {
        IpInfo {
            ipv4: self.get_ip().unwrap_or_else(|| {
                warn!("Failed to resolve local IPv4, using loopback fallback");
                "127.0.0.1".to_string()
            }),
        }
    }

    fn get_ip(&self) -> Option<String> {
        let socket = UdpSocket::bind("0.0.0.0:0").ok()?;
        socket.connect("10.10.10.10:10").ok()?;
        socket.local_addr().ok().map(|local_addr| local_addr.ip().to_string())
    }

    fn machine_id(&self) -> String {
        match machine_uid::get() {
            Ok(id) => {
                debug!("Retrieved machine ID successfully");
                id
            }
            Err(e) => {
                let error = DeviceError::machine_id(e.to_string());
                warn!("{}, generating fallback UUID", error);
                uuid::Uuid::new_v4().to_string()
            }
        }
    }

    fn host_name(&self) -> String {
        System::host_name().unwrap_or_else(|| {
            warn!("Failed to retrieve host name, using fallback");
            "Unknown".into()
        })
    }

    #[inline]
    fn platform_str(&self) -> &'static str {
        #[cfg(target_os = "windows")]
        return "windows";
        #[cfg(target_os = "android")]
        return "android";
        #[cfg(target_os = "linux")]
        return "other";
        #[cfg(target_os = "macos")]
        return "other";
        #[cfg(not(any(target_os = "windows", target_os = "android", target_os = "linux", target_os = "macos")))]
        return "other";
    }

    fn platform_info(&self) -> PlatformInfo {
        PlatformInfo {
            os: self.platform_str().into(),
        }
    }
}

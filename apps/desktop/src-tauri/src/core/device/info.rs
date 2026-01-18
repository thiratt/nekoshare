use log::{debug, warn};
use starship_battery::units::ratio::percent;
use std::net::IpAddr;
use sysinfo::System;

use super::error::DeviceError;

#[derive(Debug, Clone, serde::Serialize)]
pub struct BatteryInfo {
    pub supported: bool,
    pub charging: bool,
    pub percent: f32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

impl Default for BatteryInfo {
    fn default() -> Self {
        Self {
            supported: false,
            charging: false,
            percent: 100.0,
            error: None,
        }
    }
}

impl BatteryInfo {
    fn with_error(error: impl Into<String>) -> Self {
        Self {
            error: Some(error.into()),
            ..Default::default()
        }
    }
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct PlatformInfo {
    pub os: String,
    pub version: String,
    pub long_version: String,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct IpInfo {
    pub ipv4: String,
    pub ipv6: Option<String>,
    pub is_tailscale: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

impl Default for IpInfo {
    fn default() -> Self {
        Self {
            ipv4: "Unknown".into(),
            ipv6: None,
            is_tailscale: false,
            error: None,
        }
    }
}

impl IpInfo {
    fn with_error(error: impl Into<String>) -> Self {
        Self {
            error: Some(error.into()),
            ..Default::default()
        }
    }
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct DeviceInfo {
    pub id: String,
    pub name: String,
    pub platform: PlatformInfo,
    pub ip: IpInfo,
    pub battery: BatteryInfo,
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
            ip: self.ip(),
            battery: self.battery(),
        }
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
        #[cfg(target_os = "linux")]
        return "linux";
        #[cfg(target_os = "macos")]
        return "macos";
        #[cfg(target_os = "android")]
        return "android";
        #[cfg(not(any(
            target_os = "windows",
            target_os = "linux",
            target_os = "macos",
            target_os = "android"
        )))]
        return "other";
    }

    fn platform_info(&self) -> PlatformInfo {
        PlatformInfo {
            os: self.platform_str().into(),
            version: System::os_version().unwrap_or_else(|| {
                warn!("Failed to retrieve OS version");
                "Unknown".into()
            }),
            long_version: System::long_os_version().unwrap_or_else(|| {
                warn!("Failed to retrieve long OS version");
                "Unknown".into()
            }),
        }
    }

    fn ip(&self) -> IpInfo {
        #[cfg(target_os = "windows")]
        {
            let adapters = match ipconfig::get_adapters() {
                Ok(a) => a,
                Err(e) => {
                    let error = DeviceError::network(e.to_string());
                    warn!("{}", error);
                    return IpInfo::with_error(error.to_string());
                }
            };

            let mut fallback: Option<IpInfo> = None;

            for adapter in adapters {
                let name = adapter.adapter_name().to_lowercase();
                let desc = adapter.description().to_lowercase();
                let is_tailscale = name.contains("tailscale") || desc.contains("tailscale");
                let has_gateway = !adapter.gateways().is_empty();

                if is_tailscale || has_gateway {
                    for ip in adapter.ip_addresses() {
                        if let IpAddr::V4(ipv4) = ip {
                            if ipv4.is_loopback() || ipv4.is_link_local() {
                                continue;
                            }

                            let info = IpInfo {
                                ipv4: ipv4.to_string(),
                                ipv6: None,
                                is_tailscale,
                                error: None,
                            };

                            if is_tailscale {
                                debug!("Found Tailscale IP: {}", ipv4);
                                return info;
                            }

                            if fallback.is_none() {
                                debug!("Found fallback IP: {}", ipv4);
                                fallback = Some(info);
                            }
                        }
                    }
                }
            }

            fallback.unwrap_or_else(|| {
                warn!("No suitable IP address found");
                IpInfo::with_error("No suitable network interface found")
            })
        }

        #[cfg(not(target_os = "windows"))]
        {
            debug!("IP detection not implemented for this platform");
            IpInfo::with_error("IP detection not implemented for this platform")
        }
    }

    fn battery(&self) -> BatteryInfo {
        let manager = match starship_battery::Manager::new() {
            Ok(m) => m,
            Err(e) => {
                let error = DeviceError::battery_init(e.to_string());
                warn!("{}", error);
                return BatteryInfo::with_error(error.to_string());
            }
        };

        let batteries = match manager.batteries() {
            Ok(b) => b,
            Err(e) => {
                let error = DeviceError::battery_enum(e.to_string());
                warn!("{}", error);
                return BatteryInfo::with_error(error.to_string());
            }
        };

        for battery_result in batteries {
            match battery_result {
                Ok(battery) => {
                    debug!(
                        "Battery state: {:?}, charge: {}%",
                        battery.state(),
                        battery.state_of_charge().get::<percent>()
                    );
                    return BatteryInfo {
                        supported: true,
                        charging: matches!(
                            battery.state(),
                            starship_battery::State::Charging | starship_battery::State::Full
                        ),
                        percent: battery.state_of_charge().get::<percent>().round(),
                        error: None,
                    };
                }
                Err(e) => {
                    let error = DeviceError::battery_read(e.to_string());
                    warn!("{}", error);
                }
            }
        }

        debug!("No batteries found, using default values");
        BatteryInfo::default()
    }
}

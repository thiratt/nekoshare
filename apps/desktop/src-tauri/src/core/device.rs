use starship_battery::units::ratio::percent;
use std::net::IpAddr;
use sysinfo::System;

#[derive(Debug, Clone, serde::Serialize)]
pub struct BatteryInfo {
    pub supported: bool,
    pub charging: bool,
    pub percent: f32,
}

impl Default for BatteryInfo {
    fn default() -> Self {
        Self {
            supported: false,
            charging: false,
            percent: 100.0,
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
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct DeviceInfo {
    pub id: String,
    pub name: String,
    pub platform: PlatformInfo,
    pub ip: IpInfo,
    pub battery: BatteryInfo,
}

fn get_machine_id() -> String {
    machine_uid::get().unwrap_or_else(|e| {
        eprintln!("Failed to get machine ID: {}, generating UUID", e);
        uuid::Uuid::new_v4().to_string()
    })
}

#[inline]
const fn get_platform() -> &'static str {
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

fn get_local_ipv4() -> IpInfo {
    #[cfg(target_os = "windows")]
    {
        let adapters = match ipconfig::get_adapters() {
            Ok(a) => a,
            Err(_) => {
                return IpInfo {
                    ipv4: "Unknown".into(),
                    ipv6: None,
                    is_tailscale: false,
                };
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
                        };

                        if is_tailscale {
                            return info;
                        }

                        if fallback.is_none() {
                            fallback = Some(info);
                        }
                    }
                }
            }
        }

        fallback.unwrap_or(IpInfo {
            ipv4: "Unknown".into(),
            ipv6: None,
            is_tailscale: false,
        })
    }

    #[cfg(not(target_os = "windows"))]
    {
        IpInfo {
            ipv4: "Unknown".into(),
            ipv6: None,
            is_tailscale: false,
        }
    }
}

fn get_battery_info() -> BatteryInfo {
    let manager = match starship_battery::Manager::new() {
        Ok(m) => m,
        Err(e) => {
            eprintln!("Failed to initialize battery manager: {}", e);
            return BatteryInfo::default();
        }
    };

    let batteries = match manager.batteries() {
        Ok(b) => b,
        Err(e) => {
            eprintln!("Failed to get batteries: {}", e);
            return BatteryInfo::default();
        }
    };

    for battery_result in batteries {
        match battery_result {
            Ok(battery) => {
                return BatteryInfo {
                    supported: true,
                    charging: matches!(
                        battery.state(),
                        starship_battery::State::Charging | starship_battery::State::Full
                    ),
                    percent: battery.state_of_charge().get::<percent>().round(),
                };
            }
            Err(e) => {
                eprintln!("Error reading battery: {}", e);
            }
        }
    }

    BatteryInfo::default()
}

pub fn get_device_info() -> DeviceInfo {
    DeviceInfo {
        id: get_machine_id(),
        name: System::host_name().unwrap_or_else(|| "Unknown".into()),
        platform: PlatformInfo {
            os: get_platform().into(),
            version: System::os_version().unwrap_or_else(|| "Unknown".into()),
            long_version: System::long_os_version().unwrap_or_else(|| "Unknown".into()),
        },
        ip: get_local_ipv4(),
        battery: get_battery_info(),
    }
}

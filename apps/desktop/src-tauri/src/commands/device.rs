use std::net::{IpAddr, Ipv4Addr, UdpSocket};

use starship_battery::units::ratio::percent;
use sysinfo::{Networks, System};

#[derive(serde::Serialize)]
pub struct BatteryInfo {
    pub charging: bool,
    pub percent: f32,
}

#[derive(serde::Serialize)]
pub struct DeviceInfo {
    pub host_name: String,
    pub os: String,
    pub os_version: String,
    pub ipv4: String,
    pub battery: BatteryInfo,
}

fn get_local_ip_v4() -> Option<Ipv4Addr> {
    let udp_attempt = UdpSocket::bind("0.0.0.0:0")
        .and_then(|socket| {
            socket.connect("8.8.8.8:80")?;
            socket.local_addr()
        })
        .map(|addr| addr.ip());

    if let Ok(IpAddr::V4(ip)) = udp_attempt {
        return Some(ip);
    }

    println!("Not found Default Route (Offline?). Randomly finding IPv4 from available interfaces");

    let networks = Networks::new_with_refreshed_list();
    for (_name, network_data) in &networks {
        for network in network_data.ip_networks() {
            if let IpAddr::V4(ipv4) = network.addr {
                if !ipv4.is_loopback() {
                    return Some(ipv4);
                }
            }
        }
    }

    None
}

#[tauri::command]
pub fn get_device_info() -> DeviceInfo {
    let mut is_charging = true;
    let mut bat_percent = 100.0;

    if let Ok(manager) = starship_battery::Manager::new() {
        if let Ok(mut batteries) = manager.batteries() {
            if let Some(Ok(battery)) = batteries.next() {
                is_charging = battery.state() == starship_battery::State::Charging;
                bat_percent = battery.state_of_charge().get::<percent>().round();
            }
        }
    }

    let host_name = System::host_name().unwrap_or_else(|| "Unknown".to_string());
    let os = System::name().unwrap_or_else(|| "Unknown".to_string());
    let os_version = System::long_os_version().unwrap_or_else(|| "Unknown".to_string());
    let ipv4 = get_local_ip_v4()
        .map(|ip| ip.to_string())
        .unwrap_or_else(|| "Unknown".to_string());

    DeviceInfo {
        host_name,
        os,
        os_version,
        ipv4,
        battery: BatteryInfo {
            charging: is_charging,
            percent: bat_percent,
        },
    }
}

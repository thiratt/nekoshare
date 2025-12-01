export interface BatteryInfo {
    charging: boolean;
    percent: number;
}

export interface DeviceInfo {
    id: string;
    host_name: string;
    os: string;
    os_version: string;
    ipv4: string;
    battery?: BatteryInfo;
}

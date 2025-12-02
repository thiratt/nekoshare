export interface BatteryInfo {
	supported: boolean;
	charging: boolean;
	percent: number;
}

export interface DeviceInfo {
	id: string;
	name: string;
	platform: "windows" | "android" | "other";
	os: string;
	os_version: string;
	ipv4: string;
	battery: BatteryInfo;
}

// Type for registering a device with the server
export interface DeviceRegistration {
	id: string;
	name: string;
	platform: "windows" | "linux" | "android" | "web" | "other";
	publicKey: string;
	batterySupported: boolean;
	batteryCharging: boolean;
	batteryPercent: number;
	lastIp: string;
}

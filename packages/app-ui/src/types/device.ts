export interface BatteryInfo {
	supported: boolean;
	charging: boolean;
	percent: number;
}

export interface LocalDeviceInfo {
	id: string;
	name: string;
	platform: DevicePlatform;
	os: string;
	long_os_version: string;
	ipv4: string;
	battery: BatteryInfo;
}

export type DevicePlatform = "windows" | "android" | "web" | "other";
export type DeviceStatus = "online" | "offline";

export interface ApiDevice {
	id: string;
	userId: string;
	name: string;
	platform: DevicePlatform;
	publicKey: string;
	batterySupported: boolean;
	batteryCharging: boolean;
	batteryPercent: number;
	lastIp: string | null;
	lastActiveAt: Date | null;
	createdAt: Date;
}

export interface DeviceRegistrationPayload {
	id: string;
	name: string;
	platform: DevicePlatform;
	publicKey: string;
	batterySupported: boolean;
	batteryCharging: boolean;
	batteryPercent: number;
	lastIp: string;
}

export interface Device {
	id: string;
	name: string;
	isCurrent: boolean;
	platform: DevicePlatform;
	status: DeviceStatus;
	lastSeen: string;
	battery: {
		supported: boolean;
		charging: boolean;
		percent: number;
	};
	ip: string;
	os: string;
}

export interface DeviceListResponse {
	devices: ApiDevice[];
	total: number;
}

export interface DeviceRegistrationResponse {
	device: ApiDevice;
	isNew: boolean;
}

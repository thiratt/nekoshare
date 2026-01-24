export const OS_TYPES = ["windows", "android", "web", "other"] as const;
export type Os = (typeof OS_TYPES)[number];

export const DEVICE_STATUSES = ["online", "offline"] as const;
export type DeviceStatus = (typeof DEVICE_STATUSES)[number];

export interface ApiPlatform {
	os: Os;
	version: string;
	long_version: string;
}

export interface ApiIp {
	ipv4: string;
	ipv6?: string;
	is_tailscale: boolean;
}

export interface ApiBatteryInfo {
	supported: boolean;
	charging: boolean;
	percent: number;
}

export interface ApiDevice {
	id: string;
	deviceIdentifier: string;
	name: string;
	platform: ApiPlatform;
	ip: ApiIp;
	battery: ApiBatteryInfo;
	lastActiveAt: Date;
}

export interface ApiDeviceListResponse {
	devices: ApiDevice[];
	total: number;
}

export interface ApiDeviceRegistrationPayload {
	id: string;
	name: string;
	platform: ApiPlatform;
	ip: ApiIp;
	battery: ApiBatteryInfo;
	fingerprint?: string;
}

export interface ApiDeviceRegistrationResponse {
	device: ApiDevice;
	isNew: boolean;
}

export interface LocalDeviceInfo {
	id: string;
	name: string;
	platform: ApiPlatform;
	ip: ApiIp;
	battery: ApiBatteryInfo;
	fingerprint?: string;
}

export interface UiDevice {
	id: string;
	deviceIdentifier?: string;
	name: string;
	platform: Os;
	os: string;
	ip: string;
	isTailscale: boolean;
	battery: ApiBatteryInfo;
	isCurrent: boolean;
	status: DeviceStatus;
	lastSeen: string;
}

export interface SocketDeviceUpdatedPayload {
	id: string;
	name: string;
}

// Re-use ApiDevice but new name for clarity
export interface SocketDeviceAddedPayload extends Omit<ApiDevice, "lastActiveAt"> {
	lastActiveAt: Date;
}

export interface SocketDeviceRemovedPayload {
	id: string;
	deviceIdentifier?: string | null;
	terminatedBy: string;
}

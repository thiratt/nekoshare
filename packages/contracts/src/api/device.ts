export type Os = "windows" | "android" | "web" | "other";

export interface Platform {
	os: Os;
}

export type ApiDateTime = Date | string;

export interface Device {
	id: string;
	name: string;
	platform: Platform;
	fingerprint?: string;
	lastActiveAt: ApiDateTime;
}

export interface DeviceListResponse {
	devices: Device[];
	total: number;
}

export interface DeviceRegistrationPayload {
	id: string;
	name: string;
	platform: Platform;
	fingerprint?: string;
}

export interface DeviceRegistrationResponse {
	device: Device;
	isNew: boolean;
}

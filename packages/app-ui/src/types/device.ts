import type {
	Device as SharedDevice,
	DeviceListResponse as SharedDeviceListResponse,
	DeviceRegistrationPayload as SharedDeviceRegistrationPayload,
	DeviceRegistrationResponse as SharedDeviceRegistrationResponse,
	Os,
	Platform as SharedPlatform,
} from "@workspace/contracts/api";

export const OS_TYPES = ["windows", "android", "web", "other"] as const satisfies readonly Os[];
export type { Os };

export const DEVICE_STATUSES = ["online", "offline"] as const;
export type DeviceStatus = (typeof DEVICE_STATUSES)[number];

export type ApiPlatform = SharedPlatform;

export type ApiDevice = SharedDevice;

export type ApiDeviceListResponse = SharedDeviceListResponse;

export type ApiDeviceRegistrationPayload = SharedDeviceRegistrationPayload;

export type ApiDeviceRegistrationResponse = SharedDeviceRegistrationResponse;

export interface LocalDeviceInfo {
	id: string;
	name: string;
	platform: ApiPlatform;
	fingerprint?: string;
}

export interface UiDevice {
	id: string;
	fingerprint?: string;
	name: string;
	platform: Os;
	os: string;
	isCurrent: boolean;
	status: DeviceStatus;
	lastSeen: string;
}

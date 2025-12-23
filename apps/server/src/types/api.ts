import type { device } from "@/adapters/db/schemas";

export type ApiSuccessResponse<T> = {
	success: true;
	data: T;
};

export type ApiErrorResponse = {
	success: false;
	error: string;
	message?: string;
};

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export const success = <T>(data: T): ApiSuccessResponse<T> => ({
	success: true,
	data,
});

export const error = (error: string, message?: string): ApiErrorResponse => ({
	success: false,
	error,
	message,
});

export interface Device {
	id: string;
	name: string;
	platform: Platform;
	ip: Ip;
	battery: BatteryInfo;
}

export interface Platform {
	os: Os;
	version: string;
	long_version: string;
}

export interface Ip {
	ipv4: string;
	ipv6?: string;
	is_tailscale: boolean;
}

export interface BatteryInfo {
	supported: boolean;
	charging: boolean;
	percent: number;
}

export type DeviceListResponse = {
	devices: Device[];
	total: number;
};

export interface DeviceRegistrationRequest extends Device {
	publicKey: string;
}

export const OS_TYPES = ["windows", "android", "web", "other"] as const;
export type Os = (typeof OS_TYPES)[number];

export type DeviceRegistrationResponse = {
	device: Device;
	isNew: boolean;
};

export const FRIEND_STATUSES = ["active", "pending"] as const;
export type FriendStatus = (typeof FRIEND_STATUSES)[number];

export type Friend = {
	id: string;
	name: string;
	email: string;
	avatarUrl?: string;
	status: FriendStatus;
	sharedCount: number;
	lastActive: string;
	invitedAt: string;
};

export type FriendListResponse = {
	friends: Friend[];
	total: number;
};

export type FriendInviteRequest = {
	email: string;
	message?: string;
};

export type FriendInviteResponse = {
	friend: Friend;
	isNew: boolean;
};

export type FriendRevokeRequest = {
	ids: string[];
};

export type FriendRevokeResponse = {
	deleted: string[];
	count: number;
};

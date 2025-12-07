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

export type Device = typeof device.$inferSelect;

export type DeviceListResponse = {
	devices: Device[];
	total: number;
};

export type DeviceRegistrationRequest = {
	id: string;
	name: string;
	platform: "windows" | "android" | "web" | "other";
	publicKey: string;
	batterySupported: boolean;
	batteryCharging: boolean;
	batteryPercent: number;
	lastIp: string;
};

export type DeviceRegistrationResponse = {
	device: Device;
	isNew: boolean;
};

export type FriendStatus = "active" | "pending";

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

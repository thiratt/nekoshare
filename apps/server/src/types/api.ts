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

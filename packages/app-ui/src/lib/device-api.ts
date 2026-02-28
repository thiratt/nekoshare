import type {
	ApiDevice,
	ApiDeviceListResponse,
	ApiDeviceRegistrationPayload,
	ApiDeviceRegistrationResponse,
	LocalDeviceInfo,
	UiDevice,
} from "@workspace/app-ui/types/device";

import { createInternalError, failure, isSuccess, type Result, success } from "./errors";
import { xfetchApi } from "./xfetch";

const DEVICE_API_ENDPOINTS = {
	LIST: "/devices",
	REGISTER: "/devices/register",
	DEVICE: (id: string) => `/devices/${id}`,
} as const;

const TIME_UNITS = {
	MINUTE_MS: 60 * 1000,
	HOUR_MS: 60 * 60 * 1000,
	DAY_MS: 24 * 60 * 60 * 1000,
	WEEK_MS: 7 * 24 * 60 * 60 * 1000,
} as const;

const ONLINE_THRESHOLD_MS = 1 * TIME_UNITS.MINUTE_MS;
const KNOWN_PLATFORMS = new Set(["windows", "android", "web", "other"]);

function formatLastSeen(date: Date | string | null | undefined): string {
	if (!date) {
		return "Unknown";
	}

	try {
		const dateObj = date instanceof Date ? date : new Date(date);

		if (isNaN(dateObj.getTime())) {
			return "Unknown";
		}

		const now = new Date();
		const diffMs = now.getTime() - dateObj.getTime();

		if (diffMs < 0) {
			return "Just now";
		}

		const diffMinutes = Math.floor(diffMs / TIME_UNITS.MINUTE_MS);
		const diffHours = Math.floor(diffMs / TIME_UNITS.HOUR_MS);
		const diffDays = Math.floor(diffMs / TIME_UNITS.DAY_MS);

		if (diffMinutes < 1) return "Just now";
		if (diffMinutes === 1) return "1 minute ago";
		if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
		if (diffHours === 1) return "1 hour ago";
		if (diffHours < 24) return `${diffHours} hours ago`;
		if (diffDays === 1) return "1 day ago";
		if (diffDays < 7) return `${diffDays} days ago`;

		return dateObj.toLocaleDateString("en-US", {
			day: "numeric",
			month: "short",
			year: "numeric",
		});
	} catch {
		return "Unknown";
	}
}

function capitalizeFirst(str: string): string {
	if (!str || str.length === 0) return str;
	return str.charAt(0).toUpperCase() + str.slice(1);
}

function normalizePlatform(input: unknown): UiDevice["platform"] {
	if (typeof input === "string" && KNOWN_PLATFORMS.has(input)) {
		return input as UiDevice["platform"];
	}

	if (typeof input === "object" && input !== null && "os" in input) {
		const os = (input as { os?: unknown }).os;
		if (typeof os === "string" && KNOWN_PLATFORMS.has(os)) {
			return os as UiDevice["platform"];
		}
	}

	return "other";
}

function isDeviceOnline(lastActiveAt: Date | string | null | undefined): boolean {
	if (!lastActiveAt) return false;

	try {
		const lastActive = lastActiveAt instanceof Date ? lastActiveAt : new Date(lastActiveAt);
		return new Date().getTime() - lastActive.getTime() < ONLINE_THRESHOLD_MS;
	} catch {
		return false;
	}
}

export function transformApiDevice(
	apiDevice: ApiDevice,
	currentDevice?: { id?: string; fingerprint?: string },
): UiDevice {
	const isCurrent =
		!!currentDevice &&
		(apiDevice.id === currentDevice.id ||
			(!!apiDevice.fingerprint && !!currentDevice.fingerprint && apiDevice.fingerprint === currentDevice.fingerprint));

	const platform = normalizePlatform(apiDevice.platform);
	const osDisplay = capitalizeFirst(platform);

	const isOnline = isDeviceOnline(apiDevice.lastActiveAt);
	const status: UiDevice["status"] = isCurrent || isOnline ? "online" : "offline";

	return {
		id: apiDevice.id,
		fingerprint: apiDevice.fingerprint,
		name: apiDevice.name,
		isCurrent,
		platform,
		os: osDisplay,
		status,
		lastSeen: isCurrent ? "Now" : formatLastSeen(apiDevice.lastActiveAt),
	};
}

export function transformLocalDevice(localDevice: LocalDeviceInfo): UiDevice {
	const platform = normalizePlatform(localDevice.platform);
	const osDisplay = capitalizeFirst(platform);

	return {
		id: localDevice.id,
		fingerprint: localDevice.fingerprint,
		name: localDevice.name,
		isCurrent: true,
		platform,
		os: osDisplay,
		status: "online",
		lastSeen: "Now",
	};
}

export async function fetchDevices(signal?: AbortSignal): Promise<Result<ApiDeviceListResponse>> {
	return xfetchApi<ApiDeviceListResponse>(DEVICE_API_ENDPOINTS.LIST, {
		method: "GET",
		signal,
		operation: "Fetch device list",
	});
}

export async function registerDevice(
	payload: ApiDeviceRegistrationPayload,
): Promise<Result<ApiDeviceRegistrationResponse>> {
	if (!payload.id || payload.id.trim().length === 0) {
		return failure(createInternalError("Device ID is required for registration", "Device Registration"));
	}

	if (!payload.name || payload.name.trim().length === 0) {
		return failure(createInternalError("Device name is required for registration", "Device Registration"));
	}

	return xfetchApi<ApiDeviceRegistrationResponse>(DEVICE_API_ENDPOINTS.REGISTER, {
		method: "POST",
		body: payload,
		operation: "Register device",
	});
}

export async function updateDevice(deviceId: string, data: Partial<Pick<ApiDevice, "name">>): Promise<Result<void>> {
	if (!deviceId || deviceId.trim().length === 0) {
		return failure(createInternalError("Device ID is required for update operation", "Device Update"));
	}

	if (!data.name || data.name.trim().length === 0) {
		return failure(createInternalError("Device name cannot be empty", "Device Update"));
	}

	const result = await xfetchApi<null>(DEVICE_API_ENDPOINTS.DEVICE(deviceId), {
		method: "PATCH",
		body: data,
		operation: `Update device "${deviceId}"`,
	});

	if (isSuccess(result)) {
		return success(undefined);
	}

	return result;
}

export async function deleteDevice(deviceId: string): Promise<Result<void>> {
	if (!deviceId || deviceId.trim().length === 0) {
		return failure(createInternalError("Device ID is required for delete operation", "Device Deletion"));
	}

	const result = await xfetchApi<null>(DEVICE_API_ENDPOINTS.DEVICE(deviceId), {
		method: "DELETE",
		operation: `Delete device "${deviceId}"`,
	});

	if (isSuccess(result)) {
		return success(undefined);
	}

	return result;
}

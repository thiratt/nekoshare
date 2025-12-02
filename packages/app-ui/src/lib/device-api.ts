import type {
	ApiDevice,
	Device,
	DeviceListResponse,
	DeviceRegistrationPayload,
	DeviceRegistrationResponse,
	LocalDeviceInfo,
} from "@workspace/app-ui/types/device";
import { xfetch } from "./xfetch";

function formatLastSeen(date: Date | string | null): string {
	if (!date) return "ไม่ทราบ";

	const now = new Date();
	const lastActive = new Date(date);
	const diffMs = now.getTime() - lastActive.getTime();
	const diffMinutes = Math.floor(diffMs / (1000 * 60));
	const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

	if (diffMinutes < 1) return "ตอนนี้";
	if (diffMinutes < 60) return `${diffMinutes} นาทีที่แล้ว`;
	if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`;
	if (diffDays < 7) return `${diffDays} วันที่แล้ว`;

	return lastActive.toLocaleDateString("th-TH", {
		day: "numeric",
		month: "short",
		year: "numeric",
	});
}

function isDeviceOnline(lastActiveAt: Date | string | null): boolean {
	if (!lastActiveAt) return false;
	const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
	return new Date(lastActiveAt).getTime() > fiveMinutesAgo;
}

export function transformApiDevice(apiDevice: ApiDevice, currentDeviceId?: string): Device {
	return {
		id: apiDevice.id,
		name: apiDevice.name,
		isCurrent: apiDevice.id === currentDeviceId,
		platform: apiDevice.platform,
		status: isDeviceOnline(apiDevice.lastActiveAt) ? "online" : "offline",
		lastSeen: formatLastSeen(apiDevice.lastActiveAt),
		battery: {
			supported: apiDevice.batterySupported,
			charging: apiDevice.batteryCharging,
			percent: apiDevice.batteryPercent,
		},
		ip: apiDevice.lastIp ?? "ไม่ทราบ",
		os: apiDevice.platform,
	};
}

export function transformLocalDevice(localDevice: LocalDeviceInfo): Device {
	return {
		id: localDevice.id,
		name: localDevice.name,
		isCurrent: true,
		platform: localDevice.platform,
		status: "online",
		lastSeen: "ตอนนี้",
		battery: {
			supported: localDevice.battery.supported,
			charging: localDevice.battery.charging,
			percent: localDevice.battery.percent,
		},
		ip: localDevice.ipv4,
		os: `${localDevice.os} ${localDevice.os_version}`,
	};
}

export async function fetchDevices(signal?: AbortSignal): Promise<DeviceListResponse> {
	const response = await xfetch("/devices", {
		method: "GET",
		signal,
	});

	if (!response.ok) {
		throw new Error("Failed to fetch devices");
	}

	const result = await response.json();

	if (!result.success) {
		throw new Error(result.message || "Failed to fetch devices");
	}

	return result.data;
}

export async function registerDevice(payload: DeviceRegistrationPayload): Promise<DeviceRegistrationResponse> {
	const response = await xfetch("/devices/register", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(payload),
	});

	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		throw new Error(errorData.message || "Failed to register device");
	}

	const result = await response.json();

	if (!result.success) {
		throw new Error(result.message || "Failed to register device");
	}

	return result.data;
}

export async function updateDevice(deviceId: string, data: Partial<Pick<ApiDevice, "name">>): Promise<void> {
	const response = await xfetch(`/devices/${deviceId}`, {
		method: "PATCH",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(data),
	});

	if (!response.ok) {
		throw new Error("Failed to update device");
	}
}

export async function deleteDevice(deviceId: string): Promise<void> {
	const response = await xfetch(`/devices/${deviceId}`, {
		method: "DELETE",
	});

	if (!response.ok) {
		throw new Error("Failed to delete device");
	}
}

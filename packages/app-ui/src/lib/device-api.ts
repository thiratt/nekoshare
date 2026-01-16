import type {
	ApiDevice,
	ApiDeviceListResponse,
	ApiDeviceRegistrationPayload,
	ApiDeviceRegistrationResponse,
	LocalDeviceInfo,
	UiDevice,
} from "@workspace/app-ui/types/device";

import { xfetch } from "./xfetch";

export function transformApiDevice(apiDevice: ApiDevice, currentDeviceId?: string): UiDevice {
	const isCurrent = apiDevice.deviceIdentifier === currentDeviceId || apiDevice.id === currentDeviceId;

	const os = `${apiDevice.platform.os.charAt(0).toUpperCase() + apiDevice.platform.os.slice(1)} ${apiDevice.platform.version}`;

	const formatLastSeen = (date: Date): string => {
		try {
			const now = new Date();
			const diffMs = now.getTime() - new Date(date).getTime();
			const diffMinutes = Math.floor(diffMs / (1000 * 60));
			const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
			const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

			if (diffMinutes < 1) return "ตอนนี้";
			if (diffMinutes < 60) return `${diffMinutes} นาทีที่แล้ว`;
			if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`;
			if (diffDays < 7) return `${diffDays} วันที่แล้ว`;

			return new Date(date).toLocaleDateString("th-TH", {
				day: "numeric",
				month: "short",
				year: "numeric",
			});
		} catch {
			return "ไม่ทราบ";
		}
	};

	const isOnline = apiDevice.lastActiveAt
		? new Date().getTime() - new Date(apiDevice.lastActiveAt).getTime() < 1 * 60 * 1000
		: false;

	const status: UiDevice["status"] = isCurrent || isOnline ? "online" : "offline";

	return {
		id: apiDevice.id,
		deviceIdentifier: apiDevice.deviceIdentifier,
		name: apiDevice.name,
		isCurrent,
		platform: apiDevice.platform.os,
		os,
		ip: apiDevice.ip.ipv6 ? `${apiDevice.ip.ipv4} / ${apiDevice.ip.ipv6}` : apiDevice.ip.ipv4,
		isTailscale: apiDevice.ip.is_tailscale,
		status,
		lastSeen: isCurrent ? "ตอนนี้" : formatLastSeen(apiDevice.lastActiveAt),
		battery: apiDevice.battery,
	};
}

export function transformLocalDevice(localDevice: LocalDeviceInfo): UiDevice {
	const os = `${localDevice.platform.os.charAt(0).toUpperCase() + localDevice.platform.os.slice(1)} ${localDevice.platform.version}`;

	const ip = localDevice.ip.ipv6 ? `${localDevice.ip.ipv4} / ${localDevice.ip.ipv6}` : localDevice.ip.ipv4;

	return {
		id: localDevice.id,
		name: localDevice.name,
		isCurrent: true,
		platform: localDevice.platform.os,
		os,
		ip,
		isTailscale: localDevice.ip.is_tailscale,
		status: "online",
		lastSeen: "ตอนนี้",
		battery: localDevice.battery,
	};
}

export async function fetchDevices(signal?: AbortSignal): Promise<ApiDeviceListResponse> {
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

export async function registerDevice(payload: ApiDeviceRegistrationPayload): Promise<ApiDeviceRegistrationResponse> {
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

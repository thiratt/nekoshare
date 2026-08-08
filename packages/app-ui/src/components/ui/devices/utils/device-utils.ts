import type { DragEvent } from "react";

import type { UiDevice } from "@workspace/app-ui/types/device";

import type { DeviceGroups, DeviceItem, DeviceKind } from "../types";

export function capitalize(value?: string): string {
	return value && value.length > 0 ? value.charAt(0).toUpperCase() + value.slice(1) : "Unknown";
}

export function filterDeviceGroups(devices: UiDevice[], query: string): DeviceGroups {
	const normalizedQuery = query.trim().toLowerCase();
	const matchesQuery = (device: UiDevice) =>
		!normalizedQuery || `${device.name} ${device.os} ${device.platform}`.toLowerCase().includes(normalizedQuery);
	const filteredDevices = devices.filter(matchesQuery);

	return {
		currentDevices: filteredDevices.filter((device) => device.isCurrent),
		otherDevices: filteredDevices.filter((device) => !device.isCurrent),
	};
}

export function canSendToDevice(device: DeviceItem) {
	return device.online && !device.isCurrent;
}

export function canDropFiles(event: DragEvent, device: DeviceItem, dropEnabled: boolean) {
	return dropEnabled && canSendToDevice(device) && event.dataTransfer.types.includes("Files");
}

export function toDeviceItem(device: UiDevice): DeviceItem {
	return {
		id: device.id,
		name: device.name,
		platform: device.os || device.platform,
		kind: resolveDeviceKind(device.platform, device.os),
		online: device.status === "online",
		isCurrent: device.isCurrent,
		lastActive: formatLastActive(device.lastSeen),
		fingerprint: device.fingerprint,
		// TODO(api): Device connection path and app version are not exposed by the
		// current device API. Leave them absent instead of presenting mock values.
		connection: undefined,
		appVersion: undefined,
	};
}

export function resolveDeviceKind(platform: string, os: string): DeviceKind {
	const value = `${platform} ${os}`.toLowerCase();

	if (value.includes("android") || value.includes("ios") || value.includes("phone")) {
		return "phone";
	}

	if (value.includes("tablet") || value.includes("ipad")) {
		return "tablet";
	}

	if (value.includes("laptop") || value.includes("macbook")) {
		return "laptop";
	}

	return "desktop";
}

export function formatLastActive(value: Date | string | null | undefined) {
	if (!value) return "Unknown";

	const timestamp = value instanceof Date ? value.getTime() : Date.parse(value);
	if (Number.isNaN(timestamp)) return "Unknown";

	const elapsed = Date.now() - timestamp;
	if (elapsed < 60_000) return "Just now";
	if (elapsed < 3_600_000) return `${Math.floor(elapsed / 60_000)}m ago`;
	if (elapsed < 86_400_000) return `${Math.floor(elapsed / 3_600_000)}h ago`;

	return new Intl.DateTimeFormat(undefined, {
		dateStyle: "medium",
	}).format(timestamp);
}

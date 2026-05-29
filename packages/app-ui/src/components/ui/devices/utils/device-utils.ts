import type { UiDevice } from "@workspace/app-ui/types/device";

import type { DeviceGroups } from "../types";

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

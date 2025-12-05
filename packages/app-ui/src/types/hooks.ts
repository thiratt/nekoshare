import type { Device, LocalDeviceInfo } from "./device";

export type SidebarState = "on" | "off";

export interface UseDevicesOptions {
	localDeviceInfo: LocalDeviceInfo | null;
}

export interface UseDevicesReturn {
	devices: Device[];
	loading: boolean;
	error: string | null;
	refresh: () => Promise<void>;
	updateDevice: (id: string, data: { name: string }) => Promise<void>;
	deleteDevice: (id: string) => Promise<void>;
}

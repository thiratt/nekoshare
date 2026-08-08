import type { UiDevice } from "@workspace/app-ui/types/device";

export type DeviceGroups = {
	currentDevices: UiDevice[];
	otherDevices: UiDevice[];
};

export type DeviceDialogState = {
	selectedDevice: UiDevice | null;
	manageOpen: boolean;
	deleteOpen: boolean;
};

export type DeviceView = "list" | "grid";

export type DeviceKind = "desktop" | "laptop" | "phone" | "tablet";

export type DeviceConnection = "LAN" | "Direct" | "Relay";

export type DeviceItem = {
	id: string;
	name: string;
	platform: string;
	kind: DeviceKind;
	online: boolean;
	isCurrent?: boolean;
	connection?: DeviceConnection;
	lastActive: string;
	appVersion?: string;
	fingerprint?: string;
};

export type DeviceCollectionProps = {
	devices: DeviceItem[];
	selectedId: string | null;
	dropTargetId: string | null;
	onSelect: (id: string) => void;
	onDropTargetChange: (id: string | null) => void;
	onFiles: (device: DeviceItem, files: File[]) => void;
	dropEnabled: boolean;
};

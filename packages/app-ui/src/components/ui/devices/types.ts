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

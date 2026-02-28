import { createWsDevicesEvents, createWsFriendsEvents } from "@/infrastructure/socket/events";
import type { DevicesEventsPort } from "@/modules/devices";
import type { FriendsEventsPort } from "@/modules/friends";

export type AppModuleDependencies = {
	devicesEvents: DevicesEventsPort;
	friendsEvents: FriendsEventsPort;
};

export function createModuleDependencies(): AppModuleDependencies {
	return {
		devicesEvents: createWsDevicesEvents(),
		friendsEvents: createWsFriendsEvents(),
	};
}

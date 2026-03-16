import { devicesRepository } from "./devices.repository";
import { createDevicesRouter } from "./devices.route";
import { DevicesService } from "./devices.service";
import type { DevicesEventsPort } from "./devices.service";

export type CreateDevicesModuleInput = {
	events: DevicesEventsPort;
};

export type DevicesModule = {
	service: DevicesService;
	router: ReturnType<typeof createDevicesRouter>;
};

export function createDevicesModule(input: CreateDevicesModuleInput): DevicesModule {
	const service = new DevicesService(devicesRepository, input.events);

	return {
		service,
		router: createDevicesRouter(service),
	};
}

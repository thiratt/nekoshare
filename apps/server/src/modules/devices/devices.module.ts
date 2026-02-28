import { createDevicesRouter } from "./devices.route";
import { devicesRepository } from "./devices.repository";
import type { DevicesEventsPort } from "./devices.service";
import { DevicesService } from "./devices.service";

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

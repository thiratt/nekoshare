import { createTransferController } from "./transfer.controller";

import type { DeviceIdentityService } from "@/modules/devices";
import { createRouter } from "@/shared/http/router";

type TransferRouteService = Parameters<typeof createTransferController>[0];

export function createTransferRouter(service: TransferRouteService, deviceIdentity: DeviceIdentityService) {
	const controller = createTransferController(service, deviceIdentity);
	const app = createRouter();

	app.post("/:transferId/relay-ticket", controller.relayTicket);

	return app;
}

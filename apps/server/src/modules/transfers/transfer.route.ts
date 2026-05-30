import { createTransferController } from "./transfer.controller";
import type { TransferHttpRepository } from "./transfer.service";

import { createRouter } from "@/shared/http/router";

type TransferRouteService = Parameters<typeof createTransferController>[0];

export function createTransferRouter(service: TransferRouteService, repository: TransferHttpRepository) {
	const controller = createTransferController(service, repository);
	const app = createRouter();

	app.post("/:transferId/relay-ticket", controller.relayTicket);

	return app;
}

import { wsRouter } from "./connection";

import { registerDeviceHandlers } from "@/infrastructure/socket/modules/device";
import { registerPeerHandlers } from "@/infrastructure/socket/modules/peer";
import { registerSystemHandlers } from "@/infrastructure/socket/modules/system";
import { registerUserHandlers } from "@/infrastructure/socket/modules/user";
import type { TransportType } from "@/infrastructure/socket/runtime/types";
import { registerTransferHandlers } from "@/modules/transfers/adapters/control-ws";

let initialized = false;

export function bootstrapWsTransport() {
	if (initialized) return;
	initialized = true;

	const transportType: TransportType = "WebSocket";
	registerSystemHandlers(wsRouter, transportType);
	registerUserHandlers(wsRouter, transportType);
	registerDeviceHandlers(wsRouter, transportType);
	registerPeerHandlers(wsRouter, transportType);
	registerTransferHandlers(wsRouter, transportType);
}

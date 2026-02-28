import { registerDeviceHandlers } from "@/infrastructure/socket/modules/device";
import { registerPeerHandlers } from "@/infrastructure/socket/modules/peer";
import { registerSystemHandlers } from "@/infrastructure/socket/modules/system";
import { registerTransferHandlers } from "@/infrastructure/socket/modules/transfer";
import { registerUserHandlers } from "@/infrastructure/socket/modules/user";
import type { TransportType } from "@/infrastructure/socket/runtime/types";

import { wsRouter } from "./connection";

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

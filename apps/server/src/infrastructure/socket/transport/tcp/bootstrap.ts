import { registerAuthHandlers } from "@/infrastructure/socket/modules/auth";
import { registerPeerHandlers } from "@/infrastructure/socket/modules/peer";
import { registerSystemHandlers } from "@/infrastructure/socket/modules/system";
import { registerUserHandlers } from "@/infrastructure/socket/modules/user";

import { tcpRouter } from "./connection";

let initialized = false;

export function bootstrapTcpTransport() {
	if (initialized) return;
	initialized = true;

	registerAuthHandlers(tcpRouter, "TCP");
	registerSystemHandlers(tcpRouter, "TCP");
	registerUserHandlers(tcpRouter, "TCP");
	registerPeerHandlers(tcpRouter, "TCP");
}

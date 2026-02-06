import type { WSContext } from "hono/ws";
import { BaseConnection, PacketRouter, SessionManager, type TransportType } from "../shared";
import {
	registerDeviceHandlers,
	registerFileTransferHandlers,
	registerPeerHandlers,
	registerSystemHandlers,
	registerUserHandlers,
} from "../shared/controllers";

export const wsRouter = new PacketRouter<WSConnection>("WebSocket");
export const wsSessionManager = new SessionManager<WSConnection>("WebSocket");

export class WSConnection extends BaseConnection {
	public readonly transportType: TransportType = "WebSocket";
	public readonly ws: WSContext<WebSocket>;
	public readonly remoteAddress: string | null;
	protected router = wsRouter;

	constructor(id: string, ws: WSContext<WebSocket>, remoteAddress?: string) {
		super(id, wsSessionManager);
		this.ws = ws;
		this.remoteAddress = remoteAddress ?? null;
	}

	protected requiresAuth(): boolean {
		return false;
	}

	protected sendRaw(buffer: Buffer): void {
		if (this.ws.readyState === 1) {
			this.ws.send(new Uint8Array(buffer));
		}
	}

	public shutdown(): void {
		this.ws.close(1000, "Connection closed");
	}
}

let initialized = false;
export function bootstrapWSControllers() {
	if (initialized) return;
	initialized = true;

	const transportType: TransportType = "WebSocket";

	registerSystemHandlers(wsRouter, transportType);
	registerUserHandlers(wsRouter, transportType);
	registerDeviceHandlers(wsRouter, transportType);
	registerPeerHandlers(wsRouter, transportType);
	registerFileTransferHandlers(wsRouter, transportType);
}

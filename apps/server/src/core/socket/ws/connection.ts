import type { WSContext } from "hono/ws";
import { BaseConnection, PacketRouter, SessionManager, type TransportType } from "../shared";
import { registerDeviceHandlers, registerSystemHandlers, registerUserHandlers } from "../shared/controllers";

export const wsRouter = new PacketRouter<WSConnection>("WebSocket");
export const wsSessionManager = new SessionManager<WSConnection>("WebSocket");

export class WSConnection extends BaseConnection {
	public readonly transportType: TransportType = "WebSocket";
	public readonly ws: WSContext<WebSocket>;
	protected router = wsRouter;

	constructor(id: string, ws: WSContext<WebSocket>) {
		super(id, wsSessionManager);
		this.ws = ws;
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

	registerSystemHandlers(wsRouter, "WebSocket");
	registerUserHandlers(wsRouter, "WebSocket");
	registerDeviceHandlers(wsRouter, "WebSocket");
}

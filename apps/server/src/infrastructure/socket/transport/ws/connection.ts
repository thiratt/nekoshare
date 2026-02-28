import type { WSContext } from "hono/ws";

import { BaseConnection } from "@/infrastructure/socket/runtime/base-connection";
import { PacketRouter } from "@/infrastructure/socket/runtime/packet-router";
import { SessionManager } from "@/infrastructure/socket/runtime/session-manager";
import type { TransportType } from "@/infrastructure/socket/runtime/types";

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

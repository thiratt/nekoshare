import type { Socket } from "net";
import { BaseConnection, PacketRouter, SessionManager, type TransportType } from "../shared";
import { registerAuthHandlers, registerSystemHandlers, registerUserHandlers } from "../shared/controllers";

export const tcpRouter = new PacketRouter<TCPConnection>("TCP");
export const tcpSessionManager = new SessionManager<TCPConnection>("TCP");

export class TCPConnection extends BaseConnection {
	public readonly transportType: TransportType = "TCP";
	public readonly socket: Socket;
	protected router = tcpRouter;

	constructor(id: string, socket: Socket) {
		super(id, tcpSessionManager);
		this.socket = socket;
	}

	protected requiresAuth(): boolean {
		return true;
	}

	protected sendRaw(buffer: Buffer): void {
		if (!this.socket.destroyed) {
			this.socket.write(buffer);
		}
	}

	public shutdown(): void {
		this.socket.end();
		this.socket.destroy();
	}
}

let initialized = false;
export function bootstrapTCPControllers() {
	if (initialized) return;
	initialized = true;

	registerAuthHandlers(tcpRouter, "TCP");
	registerSystemHandlers(tcpRouter, "TCP");
	registerUserHandlers(tcpRouter, "TCP");
}

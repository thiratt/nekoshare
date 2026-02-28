import type { Socket } from "net";

import { BaseConnection } from "@/infrastructure/socket/runtime/base-connection";
import { PacketRouter } from "@/infrastructure/socket/runtime/packet-router";
import { SessionManager } from "@/infrastructure/socket/runtime/session-manager";
import type { TransportType } from "@/infrastructure/socket/runtime/types";

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
			const lenBuffer = Buffer.allocUnsafe(4);
			lenBuffer.writeUInt32LE(buffer.length, 0);
			this.socket.write(lenBuffer);
			this.socket.write(buffer);
		}
	}

	public shutdown(): void {
		this.socket.end();
		this.socket.destroy();
	}
}

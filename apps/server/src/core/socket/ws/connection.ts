import type { WSContext } from "hono/ws";
import { BinaryReader, BinaryWriter } from "./binary-utils";
import { HEADER_SIZE } from "./config";
import { PacketType } from "./protocol";
import { mainRouter } from "./router";
import { Logger } from "@/core/logger";

export interface ISessionManager {
	getSession(userId: string): Connection | undefined;
	removeSession(userId: string): void;
}

export class Connection {
	public readonly id: string;
	public readonly ws: WSContext<WebSocket>;
	private sessionManager: ISessionManager;

	constructor(id: string, ws: WSContext<WebSocket>, manager: ISessionManager) {
		this.id = id;
		this.ws = ws;
		this.sessionManager = manager;
	}

	public sendPacket(type: PacketType, requestId: number): void;
	public sendPacket(type: PacketType, payloadWriter?: (w: BinaryWriter) => void, requestId?: number): void;

	public sendPacket(
		type: PacketType,
		payloadWriterOrRequestId?: ((w: BinaryWriter) => void) | number,
		requestId?: number
	) {
		const writer = new BinaryWriter();

		let payloadWriter: ((w: BinaryWriter) => void) | undefined;
		let finalId: number;

		if (typeof payloadWriterOrRequestId === "number") {
			payloadWriter = undefined;
			finalId = payloadWriterOrRequestId;
		} else {
			payloadWriter = payloadWriterOrRequestId;
			finalId = requestId ?? this.generateRequestId();
		}

		writer.writeUInt8(type);
		writer.writeInt32(finalId);

		if (payloadWriter) {
			payloadWriter(writer);
		}

		if (type !== PacketType.SYSTEM_HEARTBEAT) {
			Logger.debug("WebSocket", `Send Packet Type: ${PacketType[type] || type}, ID: ${finalId}`);
		}

		if (this.ws.readyState === 1) {
			this.ws.send(new Uint8Array(writer.getBuffer()));
		}
	}

	public handleMessage(data: ArrayBuffer | Buffer) {
		try {
			const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);

			if (buffer.length === 0) return;

			const type = buffer[0];

			if (buffer.length < HEADER_SIZE) {
				Logger.warn("WebSocket", `Malformed header from ${this.id}`);
				return;
			}

			const reader = new BinaryReader(buffer);
			reader.readUInt8();
			const requestId = reader.readInt32();
			mainRouter.dispatch(type, this, reader, requestId);
		} catch (error) {
			if (error instanceof Error) {
				Logger.error("WebSocket", `Error handling message from ${this.id}: ${error.message}`);
			} else {
				Logger.error("WebSocket", `Unknown error handling message from ${this.id}`);
			}
		}
	}

	public close() {
		this.sessionManager.removeSession(this.id);
	}

	private generateRequestId(): number {
		return Math.floor(Math.random() * 0x7fffffff);
	}
}

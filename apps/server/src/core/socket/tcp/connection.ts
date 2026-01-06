import type { Socket } from "net";
import { BinaryReader, BinaryWriter } from "./binary-utils";
import { HEADER_SIZE } from "./config";
import { PacketType } from "./protocol";
import { mainRouter } from "./router";
import { Logger } from "@/core/logger";
import type { Session, User } from "@/core/auth";

export interface ISessionManager {
	getSession(userId: string): Connection | undefined;
	removeSession(userId: string): void;
}

export class Connection {
	public readonly id: string;
	public readonly socket: Socket;
	private sessionManager: ISessionManager;
	private _authenticated: boolean = false;
	private _user: User | null = null;
	private _session: Session | null = null;

	constructor(id: string, socket: Socket, manager: ISessionManager) {
		this.id = id;
		this.socket = socket;
		this.sessionManager = manager;
	}

	public get isAuthenticated(): boolean {
		return this._authenticated;
	}

	public get user(): User | null {
		return this._user;
	}

	public get userId(): string | null {
		return this._user?.id ?? null;
	}

	public get session(): Session | null {
		return this._session;
	}

	public setAuthenticated(data: { session: Session & Record<string, any>; user: User & Record<string, any> }): void {
		this._authenticated = true;
		this._user = data.user;
		this._session = data.session;
		Logger.debug("TCP", `Set authenticated for client ${this.id}, user ID: ${this._user.id}`);
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
			Logger.debug("TCP", `Send Packet Type: ${PacketType[type] || type}, ID: ${finalId}`);
		}

		if (!this.socket.destroyed) {
			this.socket.write(writer.getBuffer());
		}
	}

	public handleMessage(data: Buffer) {
		try {
			const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);

			if (buffer.length === 0) return;

			const type = buffer[0];

			if (buffer.length < HEADER_SIZE) {
				Logger.warn("TCP", `Malformed header from ${this.id}`);
				return;
			}

			if (!this._authenticated && type !== PacketType.AUTH_LOGIN_REQUEST) {
				Logger.warn("TCP", `Unauthenticated packet from ${this.id}, type: ${type}`);
				this.sendPacket(PacketType.ERROR_PERMISSION, (w) => w.writeString("Authentication required"), 0);
				this.shutdown();
				return;
			}

			const reader = new BinaryReader(buffer);
			reader.readUInt8();
			const requestId = reader.readInt32();
			mainRouter.dispatch(type, this, reader, requestId);
		} catch (error) {
			if (error instanceof Error) {
				Logger.error("TCP", `Error handling message from ${this.id}: ${error.message}`);
			} else {
				Logger.error("TCP", `Unknown error handling message from ${this.id}`);
			}
		}
	}

	public close() {
		this.sessionManager.removeSession(this.id);
	}

	public shutdown() {
		this.socket.end();
		this.socket.destroy();
	}

	private generateRequestId(): number {
		return Math.floor(Math.random() * 0x7fffffff);
	}
}

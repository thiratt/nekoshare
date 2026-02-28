import { Logger } from "@/infrastructure/logger";
import type { Session, User } from "@/modules/auth/lib";

import { BinaryReader } from "@/infrastructure/socket/protocol/binary-reader";
import { BinaryWriter } from "@/infrastructure/socket/protocol/binary-writer";
import { HEADER_SIZE, MAX_FRAME_SIZE } from "@/infrastructure/socket/protocol/frame";
import { PacketType } from "@/infrastructure/socket/protocol/packet-type";
import type { TransportType } from "./types";

interface BaseSessionManager {
	removeSession(userId: string): void;
}

interface BaseRouter {
	dispatch(type: number, client: BaseConnection, reader: BinaryReader, requestId: number): void;
}

export abstract class BaseConnection {
	public readonly id: string;
	public abstract readonly transportType: TransportType;

	protected sessionManager: BaseSessionManager;
	protected _authenticated: boolean = false;
	protected _user: User | null = null;
	protected _session: Session | null = null;
	protected abstract router: BaseRouter;

	constructor(id: string, manager: BaseSessionManager) {
		this.id = id;
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

	public setAuthenticated(data: { session: Session; user: User }): void {
		this._authenticated = true;
		this._user = data.user;
		this._session = data.session;
		Logger.debug(this.transportType, `Set authenticated for client ${this.id}, user ID: ${this._user.id}`);
	}

	public sendPacket(type: PacketType, requestId: number): void;
	public sendPacket(type: PacketType, payloadWriter?: (w: BinaryWriter) => void, requestId?: number): void;

	public sendPacket(
		type: PacketType,
		payloadWriterOrRequestId?: ((w: BinaryWriter) => void) | number,
		requestId?: number,
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
			Logger.debug(this.transportType, `Send Packet Type: ${PacketType[type] || type}, ID: ${finalId}`);
		}

		this.sendRaw(writer.getBuffer());
	}

	public handleMessage(data: Buffer | ArrayBuffer) {
		try {
			const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);

			if (buffer.length === 0) return;

			const type = buffer[0];

			if (buffer.length < HEADER_SIZE) {
				Logger.warn(this.transportType, `Malformed header from ${this.id}`);
				return;
			}

			if (buffer.length > MAX_FRAME_SIZE) {
				Logger.warn(
					this.transportType,
					`Frame too large from ${this.id}: ${buffer.length} bytes (max: ${MAX_FRAME_SIZE})`,
				);
				this.shutdown();
				return;
			}

			// TCP needs explicit auth; WS is pre-authenticated via HTTP middleware.
			if (this.requiresAuth() && !this._authenticated && type !== PacketType.AUTH_LOGIN_REQUEST) {
				Logger.warn(this.transportType, `Unauthenticated packet from ${this.id}, type: ${type}`);
				const errorPayload = JSON.stringify({ message: "Authentication required" });
				this.sendPacket(PacketType.ERROR_PERMISSION, (w) => w.writeString(errorPayload), 0);
				this.shutdown();
				return;
			}

			const reader = new BinaryReader(buffer);
			reader.readUInt8();
			const requestId = reader.readInt32();
			this.router.dispatch(type, this, reader, requestId);
		} catch (error) {
			if (error instanceof Error) {
				Logger.error(this.transportType, `Error handling message from ${this.id}: ${error.message}`);
			} else {
				Logger.error(this.transportType, `Unknown error handling message from ${this.id}`);
			}
		}
	}

	public close() {
		this.sessionManager.removeSession(this.id);
	}

	protected generateRequestId(): number {
		return Math.floor(Math.random() * 0x7fffffff);
	}

	protected abstract requiresAuth(): boolean;
	protected abstract sendRaw(buffer: Buffer): void;
	public abstract shutdown(): void;
}

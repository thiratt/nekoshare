import type { Session, User } from "@/modules/auth/lib";
import type { UserDeviceInfoPacket } from "@workspace/contracts/ws";

import type { BinaryReader } from "@/infrastructure/socket/protocol/binary-reader";
import type { BinaryWriter } from "@/infrastructure/socket/protocol/binary-writer";
import type { PacketType } from "@/infrastructure/socket/protocol/packet-type";

export type TransportType = "TCP" | "WebSocket";

export interface ISessionManager<T extends IConnection> {
	addSession(connection: T): void;
	getSession(connectionId: string): T | undefined;
	getSessionsByUserId(userId: string): T[];
	removeSession(connectionId: string): void;
}

export interface IConnection {
	readonly id: string;
	readonly transportType: TransportType;
	readonly isAuthenticated: boolean;
	readonly user: User | null;
	readonly userId: string | null;
	readonly session: Session | null;
	setAuthenticated(data: { session: Session; user: User }): void;
	sendPacket(type: PacketType, requestId: number): void;
	sendPacket(type: PacketType, payloadWriter?: (w: BinaryWriter) => void, requestId?: number): void;
	handleMessage(data: Buffer | ArrayBuffer): void;
	close(): void;
	shutdown(): void;
}

export type CommandHandler<T extends IConnection = IConnection> = (
	client: T,
	reader: BinaryReader,
	requestId: number,
) => Promise<void> | void;

export type { UserDeviceInfoPacket };

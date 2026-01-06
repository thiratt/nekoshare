import type { BinaryReader, BinaryWriter } from "./binary-utils";
import type { PacketType } from "./protocol";
import type { Session, User } from "@/core/auth";

export type TransportType = "TCP" | "WebSocket";

export interface ISessionManager<T extends IConnection> {
	addSession(connection: T): void;
	getSession(userId: string): T | undefined;
	removeSession(userId: string): void;
}

export interface IConnection {
	readonly id: string;
	readonly transportType: TransportType;
	readonly isAuthenticated: boolean;
	readonly user: User | null;
	readonly userId: string | null;
	readonly session: Session | null;
	setAuthenticated(data: { session: Session & Record<string, any>; user: User & Record<string, any> }): void;
	sendPacket(type: PacketType, requestId: number): void;
	sendPacket(type: PacketType, payloadWriter?: (w: BinaryWriter) => void, requestId?: number): void;
	handleMessage(data: Buffer | ArrayBuffer): void;
	close(): void;
	shutdown(): void;
}

export type CommandHandler<T extends IConnection = IConnection> = (
	client: T,
	reader: BinaryReader,
	requestId: number
) => Promise<void> | void;

export interface UserDeviceInfoPacket {
	deviceName: string;
	ip: {
		type: "IPv4" | "IPv6";
		address: string;
	};
	batteryLevel: number;
}

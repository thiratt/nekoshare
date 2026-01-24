import type {
	SocketDeviceAddedPayload,
	SocketDeviceRemovedPayload,
	SocketDeviceUpdatedPayload,
} from "@workspace/app-ui/types/device";

import { safeJsonParse } from "../json";
import { BinaryReader } from "./binary-utils";
import type { Result } from "../errors";

export enum PacketType {
	// System Packets (0x01 - 0x0F)
	SYSTEM_HEARTBEAT = 0x01,

	// Peer Discovery & Signaling (0x30 - 0x3F)
	PEER_CONNECT_REQUEST = 0x31,
	PEER_CONNECT_RESPONSE = 0x32,
	PEER_SOCKET_READY = 0x33,
	PEER_CONNECTION_INFO = 0x34,
	PEER_INCOMING_REQUEST = 0x35,

	// Device Management (0x90 - 0x9F)
	DEVICE_RENAME = 0x90,
	DEVICE_DELETE = 0x91,
	DEVICE_UPDATED = 0x92,
	DEVICE_REMOVED = 0x93,
	DEVICE_ADDED = 0x94,

	// Error Packets (0xF0 - 0xFF)
	ERROR_GENERIC = 0xf0,
}

export const PeerConnectStatus = {
	FAILED: 0,
	PENDING: 1,
	SUCCESS: 2,
} as const;

export type PeerConnectStatus = (typeof PeerConnectStatus)[keyof typeof PeerConnectStatus];

export interface PeerConnectResponsePayload {
	readonly success: boolean;
	readonly requestId?: string;
	readonly message: string;
	readonly status: PeerConnectStatus;
}

export interface PeerIncomingRequestPayload {
	readonly requestId: string;
	readonly sourceDeviceId: string;
	readonly sourceDeviceName: string;
	readonly sourceDeviceIp: string;
}

export interface PeerConnectionInfoPayload {
	readonly requestId: string;
	readonly host: string;
	readonly port: number;
	readonly deviceName: string;
	readonly fingerprint: string;
}

export interface ErrorPayload {
	readonly message: string;
	readonly code?: string;
}

type PacketParser<T> = (reader: BinaryReader) => T;

function parseJsonPayload<T>(reader: BinaryReader, payloadName: string): Result<T> {
	const jsonString = reader.readString();
	return safeJsonParse<T>(jsonString, {
		source: "api",
		operation: `Parse ${payloadName} packet`,
	});
}

export const PacketParsers = {
	[PacketType.SYSTEM_HEARTBEAT]: (): undefined => undefined,
	[PacketType.DEVICE_UPDATED]: (reader: BinaryReader): Result<SocketDeviceUpdatedPayload> =>
		parseJsonPayload<SocketDeviceUpdatedPayload>(reader, "DEVICE_UPDATED"),
	[PacketType.DEVICE_REMOVED]: (reader: BinaryReader): Result<SocketDeviceRemovedPayload> =>
		parseJsonPayload<SocketDeviceRemovedPayload>(reader, "DEVICE_REMOVED"),
	[PacketType.DEVICE_ADDED]: (reader: BinaryReader): Result<SocketDeviceAddedPayload> =>
		parseJsonPayload<SocketDeviceAddedPayload>(reader, "DEVICE_ADDED"),
	[PacketType.ERROR_GENERIC]: (reader: BinaryReader): ErrorPayload => ({
		message: reader.readString(),
	}),
	[PacketType.PEER_CONNECT_RESPONSE]: (reader: BinaryReader): PeerConnectResponsePayload => {
		const statusByte = reader.readUInt8();

		if (statusByte === PeerConnectStatus.FAILED) {
			return {
				success: false,
				message: reader.readString(),
				status: PeerConnectStatus.FAILED,
			};
		}

		const requestId = reader.readString();
		const message = reader.readString();

		return {
			success: true,
			requestId,
			message,
			status: statusByte === PeerConnectStatus.PENDING ? PeerConnectStatus.PENDING : PeerConnectStatus.SUCCESS,
		};
	},
	[PacketType.PEER_INCOMING_REQUEST]: (reader: BinaryReader): PeerIncomingRequestPayload => ({
		requestId: reader.readString(),
		sourceDeviceId: reader.readString(),
		sourceDeviceName: reader.readString(),
		sourceDeviceIp: reader.readString(),
	}),
	[PacketType.PEER_CONNECTION_INFO]: (reader: BinaryReader): PeerConnectionInfoPayload => {
		const requestId = reader.readString();
		const host = reader.readString();
		const portHigh = reader.readUInt8();
		const portLow = reader.readUInt8();
		const port = (portHigh << 8) | portLow;
		const deviceName = reader.readString();
		const fingerprint = reader.readString();

		return { requestId, host, port, deviceName, fingerprint };
	},
} as const satisfies Partial<Record<PacketType, PacketParser<unknown>>>;

type InferredParsers = typeof PacketParsers;
type ParsedPayloads = {
	[K in keyof InferredParsers]: ReturnType<InferredParsers[K]>;
};
type VoidPayloads = {
	[K in Exclude<PacketType, keyof InferredParsers>]: void;
};

export type PacketPayloads = ParsedPayloads & VoidPayloads;
export type PayloadOf<T extends PacketType> = T extends keyof PacketPayloads ? PacketPayloads[T] : never;
export function hasParser(type: PacketType): type is keyof typeof PacketParsers {
	return type in PacketParsers;
}
export function getPacketTypeName(type: PacketType): string {
	return PacketType[type] ?? `UNKNOWN_0x${type.toString(16).toUpperCase().padStart(2, "0")}`;
}

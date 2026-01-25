import type {
	SocketDeviceAddedPayload,
	SocketDeviceRemovedPayload,
	SocketDeviceUpdatedPayload,
} from "@workspace/app-ui/types/device";

import { safeJsonParse } from "../json";
import { BinaryReader } from "./binary-utils";
import type { Result } from "../errors";

export enum PacketType {
	// System Packets (0x00 - 0x0F)
	SYSTEM_HANDSHAKE = 0x00,
	SYSTEM_HEARTBEAT = 0x01,
	SYSTEM_KICK = 0x02,

	// Authentication (0x10 - 0x1F)
	AUTH_LOGIN_REQUEST = 0x10,
	AUTH_LOGIN_RESPONSE = 0x11,
	AUTH_TOKEN_REFRESH = 0x12,
	AUTH_LOGOUT = 0x13,

	// User & State (0x20 - 0x2F)
	USER_GET_PROFILE = 0x20,
	USER_UPDATE_PROFILE = 0x21,
	USER_UPDATE_DEVICE = 0x22,
	USER_STATUS_CHANGE = 0x23,

	// Peer Discovery & Signaling (0x30 - 0x3F)
	PEER_LIST_REQUEST = 0x30,
	PEER_CONNECT_REQUEST = 0x31,
	PEER_CONNECT_RESPONSE = 0x32,
	PEER_SOCKET_READY = 0x33,
	PEER_CONNECTION_INFO = 0x34,
	PEER_INCOMING_REQUEST = 0x35,
	PEER_SIGNALING_DATA = 0x36,
	PEER_CONNECTION_CONFIRM = 0x37,
	PEER_DISCONNECT = 0x38,
	PEER_DISCONNECTED = 0x39,
	ACK = 0x3a,

	// File Transfer Control (0x40 - 0x4F)
	FILE_OFFER = 0x40,
	FILE_ACCEPT = 0x41,
	FILE_REJECT = 0x42,
	FILE_PAUSE = 0x43,
	FILE_RESUME = 0x44,
	FILE_ACK = 0x45,

	// File Transfer Data (0x50 - 0x5F)
	FILE_CHUNK = 0x50,

	// Clipboard & Text (0x60 - 0x6F)
	TEXT_MESSAGE = 0x60,
	CLIPBOARD_COPY = 0x61,

	// Input (0x70 - 0x8F)
	INPUT_KEY_DOWN = 0x70,
	INPUT_MOUSE_MOVE = 0x71,

	// Device Management (0x90 - 0x9F)
	DEVICE_RENAME = 0x90,
	DEVICE_DELETE = 0x91,
	DEVICE_UPDATED = 0x92,
	DEVICE_REMOVED = 0x93,
	DEVICE_ADDED = 0x94,

	// Debug (0xE0 - 0xEF)
	DEBUG_LOG = 0xe0,
	DEBUG_PERFORMANCE = 0xe1,

	// Error Packets (0xF0 - 0xFF)
	ERROR_GENERIC = 0xf0,
	ERROR_PERMISSION = 0xf1,
	ERROR_NOT_FOUND = 0xf2,
	ERROR_SERVER_FULL = 0xf3,
}

export interface PeerConnectResponsePayload {
	readonly success: boolean;
	readonly status: "pending" | "failed" | "duplicate";
	readonly requestId?: string;
	readonly message: string;
}

export interface PeerIncomingRequestPayload {
	readonly requestId: string;
	readonly sourceDeviceId: string;
	readonly sourceDeviceName: string;
	readonly sourceIp: string;
}

export interface PeerConnectionInfoPayload {
	readonly requestId: string;
	readonly ip: string;
	readonly port: number;
	readonly deviceName: string;
	readonly fingerprint: string;
}

export interface PeerSocketReadyResponsePayload {
	readonly success: boolean;
	readonly message: string;
}

export interface PeerDisconnectedPayload {
	readonly deviceId: string;
	readonly reason: string;
}

export interface AckPayload {
	readonly success: boolean;
	readonly message: string;
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
	[PacketType.PEER_CONNECT_RESPONSE]: (reader: BinaryReader): Result<PeerConnectResponsePayload> =>
		parseJsonPayload<PeerConnectResponsePayload>(reader, "PEER_CONNECT_RESPONSE"),
	[PacketType.PEER_INCOMING_REQUEST]: (reader: BinaryReader): Result<PeerIncomingRequestPayload> =>
		parseJsonPayload<PeerIncomingRequestPayload>(reader, "PEER_INCOMING_REQUEST"),
	[PacketType.PEER_CONNECTION_INFO]: (reader: BinaryReader): Result<PeerConnectionInfoPayload> =>
		parseJsonPayload<PeerConnectionInfoPayload>(reader, "PEER_CONNECTION_INFO"),
	[PacketType.PEER_SOCKET_READY]: (reader: BinaryReader): Result<PeerSocketReadyResponsePayload> =>
		parseJsonPayload<PeerSocketReadyResponsePayload>(reader, "PEER_SOCKET_READY"),
	[PacketType.PEER_DISCONNECTED]: (reader: BinaryReader): Result<PeerDisconnectedPayload> =>
		parseJsonPayload<PeerDisconnectedPayload>(reader, "PEER_DISCONNECTED"),
	[PacketType.ACK]: (reader: BinaryReader): Result<AckPayload> => parseJsonPayload<AckPayload>(reader, "ACK"),
	[PacketType.ERROR_GENERIC]: (reader: BinaryReader): Result<ErrorPayload> =>
		parseJsonPayload<ErrorPayload>(reader, "ERROR_GENERIC"),
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

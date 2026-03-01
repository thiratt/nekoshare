import { safeJsonParse } from "../json";
import { BinaryReader } from "./binary-utils";
import type { Result } from "../errors";
import type {
	AckPayload,
	ErrorPayload,
	FileAcceptPayload,
	FileOfferPayload,
	FriendPresencePayload,
	FriendRemovedPayload,
	FriendRequestAcceptedPayload,
	FriendRequestCancelledPayload,
	FriendRequestReceivedPayload,
	FriendRequestRejectedPayload,
	PeerConnectionInfoPayload,
	PeerConnectResponsePayload,
	PeerDisconnectedPayload,
	PeerIncomingRequestPayload,
	PeerSocketReadyResponsePayload,
	SocketDeviceAddedPayload,
	SocketDevicePresencePayload,
	SocketDeviceRemovedPayload,
	SocketDeviceUpdatedPayload,
} from "./payload";

import { PacketType } from "@workspace/contracts/ws";
export type {
	AckPayload,
	ErrorPayload,
	PeerConnectionInfoPayload,
	PeerConnectResponsePayload,
	PeerDisconnectedPayload,
	PeerIncomingRequestPayload,
	PeerSocketReadyResponsePayload,
} from "./payload";
export { PacketType };

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
	[PacketType.DEVICE_ONLINE]: (reader: BinaryReader): Result<SocketDevicePresencePayload> =>
		parseJsonPayload<SocketDevicePresencePayload>(reader, "DEVICE_ONLINE"),
	[PacketType.DEVICE_OFFLINE]: (reader: BinaryReader): Result<SocketDevicePresencePayload> =>
		parseJsonPayload<SocketDevicePresencePayload>(reader, "DEVICE_OFFLINE"),
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
	[PacketType.FILE_OFFER]: (reader: BinaryReader): Result<FileOfferPayload> =>
		parseJsonPayload<FileOfferPayload>(reader, "FILE_OFFER"),
	[PacketType.FILE_ACCEPT]: (reader: BinaryReader): Result<FileAcceptPayload> =>
		parseJsonPayload<FileAcceptPayload>(reader, "FILE_ACCEPT"),
	[PacketType.FILE_REJECT]: (reader: BinaryReader): Result<AckPayload> =>
		parseJsonPayload<AckPayload>(reader, "FILE_REJECT"),
	[PacketType.ERROR_GENERIC]: (reader: BinaryReader): Result<ErrorPayload> =>
		parseJsonPayload<ErrorPayload>(reader, "ERROR_GENERIC"),
	[PacketType.FRIEND_REQUEST_RECEIVED]: (reader: BinaryReader): Result<FriendRequestReceivedPayload> =>
		parseJsonPayload<FriendRequestReceivedPayload>(reader, "FRIEND_REQUEST_RECEIVED"),
	[PacketType.FRIEND_REQUEST_ACCEPTED]: (reader: BinaryReader): Result<FriendRequestAcceptedPayload> =>
		parseJsonPayload<FriendRequestAcceptedPayload>(reader, "FRIEND_REQUEST_ACCEPTED"),
	[PacketType.FRIEND_REQUEST_REJECTED]: (reader: BinaryReader): Result<FriendRequestRejectedPayload> =>
		parseJsonPayload<FriendRequestRejectedPayload>(reader, "FRIEND_REQUEST_REJECTED"),
	[PacketType.FRIEND_REQUEST_CANCELLED]: (reader: BinaryReader): Result<FriendRequestCancelledPayload> =>
		parseJsonPayload<FriendRequestCancelledPayload>(reader, "FRIEND_REQUEST_CANCELLED"),
	[PacketType.FRIEND_REMOVED]: (reader: BinaryReader): Result<FriendRemovedPayload> =>
		parseJsonPayload<FriendRemovedPayload>(reader, "FRIEND_REMOVED"),
	[PacketType.FRIEND_ONLINE]: (reader: BinaryReader): Result<FriendPresencePayload> =>
		parseJsonPayload<FriendPresencePayload>(reader, "FRIEND_ONLINE"),
	[PacketType.FRIEND_OFFLINE]: (reader: BinaryReader): Result<FriendPresencePayload> =>
		parseJsonPayload<FriendPresencePayload>(reader, "FRIEND_OFFLINE"),
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

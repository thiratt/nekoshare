import type { SocketDeviceRemovedPayload, SocketDeviceUpdatedPayload } from "@workspace/app-ui/types/device";

import { safeJsonParse } from "../json";
import { BinaryReader } from "./binary-utils";

export enum PacketType {
	SYSTEM_HEARTBEAT = 0x01,

	DEVICE_RENAME = 0x90,
	DEVICE_DELETE = 0x91,
	DEVICE_UPDATED = 0x92,
	DEVICE_REMOVED = 0x93,

	ERROR_GENERIC = 0xf0,
}

export const PacketParsers = {
	[PacketType.SYSTEM_HEARTBEAT]: () => undefined,
	[PacketType.DEVICE_UPDATED]: (r: BinaryReader) => safeJsonParse<SocketDeviceUpdatedPayload>(r.readString()),
	[PacketType.DEVICE_REMOVED]: (r: BinaryReader) => safeJsonParse<SocketDeviceRemovedPayload>(r.readString()),
	[PacketType.ERROR_GENERIC]: (r: BinaryReader) => r.readString(),
};

type InferredParsers = typeof PacketParsers;
type ParsedPayloads = {
	[K in keyof InferredParsers]: ReturnType<InferredParsers[K]>;
};
type VoidPayloads = {
	[K in Exclude<PacketType, keyof InferredParsers>]: void;
};

export type PacketPayloads = ParsedPayloads & VoidPayloads;

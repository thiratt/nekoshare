import { BinaryReader } from "./binary-utils";

export enum PacketType {
	SYSTEM_HEARTBEAT = 0x01,
	ERROR_GENERIC = 0xf0,
}

export const PacketParsers = {
	[PacketType.SYSTEM_HEARTBEAT]: () => undefined,
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

import type { ControlPacketKind } from "./packet-kind";
import type { ControlPacketType } from "./packet-type";

export const NEKO_PROTOCOL_VERSION = 1;

export type NekoProtocolVersion = typeof NEKO_PROTOCOL_VERSION;

export interface ControlPacketEnvelope<
	TData = unknown,
	TType extends ControlPacketType = ControlPacketType,
	TKind extends ControlPacketKind = ControlPacketKind,
> {
	protocolVersion: NekoProtocolVersion;
	id: string;
	kind: TKind;
	type: TType;
	traceId?: string;
	requestId?: string;
	sentAt: string;
	data: TData;
}

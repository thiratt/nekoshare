import { randomUUID } from "node:crypto";

import type { IConnection } from "@/infrastructure/socket/runtime/types";
import { protocol } from "@workspace/contracts";
import { PacketType } from "@workspace/contracts/ws";

export const CONTROL_PROTOCOL_ENVELOPE_PACKET_TYPE = 0x4f;

export interface CreateControlPacketEnvelopeInput<
	TData,
	TType extends protocol.ControlPacketType,
	TKind extends protocol.ControlPacketKind,
> {
	kind: TKind;
	type: TType;
	data: TData;
	id?: string;
	traceId?: string;
	requestId?: string | number;
	sentAt?: string;
}

export function createControlPacketEnvelope<
	TData,
	TType extends protocol.ControlPacketType,
	TKind extends protocol.ControlPacketKind,
>(input: CreateControlPacketEnvelopeInput<TData, TType, TKind>): protocol.ControlPacketEnvelope<TData, TType, TKind> {
	return {
		protocolVersion: protocol.NEKO_PROTOCOL_VERSION,
		id: input.id ?? randomUUID(),
		kind: input.kind,
		type: input.type,
		traceId: input.traceId,
		requestId: input.requestId === undefined ? undefined : String(input.requestId),
		sentAt: input.sentAt ?? new Date().toISOString(),
		data: input.data,
	};
}

export function createEventEnvelope<TData, TType extends protocol.ControlPacketType>(
	type: TType,
	data: TData,
	options: Omit<
		CreateControlPacketEnvelopeInput<TData, TType, typeof protocol.ControlPacketKind.EVENT>,
		"kind" | "type" | "data"
	> = {},
): protocol.ControlPacketEnvelope<TData, TType, typeof protocol.ControlPacketKind.EVENT> {
	return createControlPacketEnvelope({
		...options,
		kind: protocol.ControlPacketKind.EVENT,
		type,
		data,
	});
}

export function createResultEnvelope<TData, TType extends protocol.ControlPacketType>(
	type: TType,
	data: TData,
	options: Omit<
		CreateControlPacketEnvelopeInput<TData, TType, typeof protocol.ControlPacketKind.RESULT>,
		"kind" | "type" | "data"
	> = {},
): protocol.ControlPacketEnvelope<TData, TType, typeof protocol.ControlPacketKind.RESULT> {
	return createControlPacketEnvelope({
		...options,
		kind: protocol.ControlPacketKind.RESULT,
		type,
		data,
	});
}

export function createErrorEnvelope<TType extends protocol.ControlPacketType>(
	type: TType,
	data: protocol.ControlErrorPayload,
	options: Omit<
		CreateControlPacketEnvelopeInput<protocol.ControlErrorPayload, TType, typeof protocol.ControlPacketKind.ERROR>,
		"kind" | "type" | "data"
	> = {},
): protocol.ControlPacketEnvelope<protocol.ControlErrorPayload, TType, typeof protocol.ControlPacketKind.ERROR> {
	return createControlPacketEnvelope({
		...options,
		kind: protocol.ControlPacketKind.ERROR,
		type,
		data,
	});
}

export function sendProtocolControlPacket(connection: IConnection, envelope: protocol.ControlPacketEnvelope): void {
	connection.sendPacket(
		// Server-side Protocol v1 envelope carrier. This remains outside shared
		// legacy PacketType contracts until clients explicitly migrate.
		CONTROL_PROTOCOL_ENVELOPE_PACKET_TYPE as PacketType,
		(writer) => {
			writer.writeString(JSON.stringify(envelope));
		},
	);
}

import { canEmitProtocolPackets } from "@/infrastructure/socket/protocol";
import type { IConnection } from "@/infrastructure/socket/runtime/types";
import { protocol } from "@workspace/contracts";

export type ProtocolTransferCommandEnvelope =
	| protocol.ControlPacketEnvelope<
			protocol.TransferOfferCommandPayload,
			typeof protocol.ControlPacketType.TRANSFER_OFFER,
			typeof protocol.ControlPacketKind.COMMAND
	  >
	| protocol.ControlPacketEnvelope<
			protocol.TransferAcceptCommandPayload,
			typeof protocol.ControlPacketType.TRANSFER_ACCEPT,
			typeof protocol.ControlPacketKind.COMMAND
	  >
	| protocol.ControlPacketEnvelope<
			protocol.TransferRejectCommandPayload,
			typeof protocol.ControlPacketType.TRANSFER_REJECT,
			typeof protocol.ControlPacketKind.COMMAND
	  >
	| protocol.ControlPacketEnvelope<
			protocol.TransferCancelCommandPayload,
			typeof protocol.ControlPacketType.TRANSFER_CANCEL,
			typeof protocol.ControlPacketKind.COMMAND
	  >;

export type ProtocolTransferCommandMapping =
	| {
			type: typeof protocol.ControlPacketType.TRANSFER_OFFER;
			envelope: Extract<
				ProtocolTransferCommandEnvelope,
				{ type: typeof protocol.ControlPacketType.TRANSFER_OFFER }
			>;
			command: protocol.TransferOfferCommandPayload;
	  }
	| {
			type: typeof protocol.ControlPacketType.TRANSFER_ACCEPT;
			envelope: Extract<
				ProtocolTransferCommandEnvelope,
				{ type: typeof protocol.ControlPacketType.TRANSFER_ACCEPT }
			>;
			command: protocol.TransferAcceptCommandPayload;
	  }
	| {
			type: typeof protocol.ControlPacketType.TRANSFER_REJECT;
			envelope: Extract<
				ProtocolTransferCommandEnvelope,
				{ type: typeof protocol.ControlPacketType.TRANSFER_REJECT }
			>;
			command: protocol.TransferRejectCommandPayload;
	  }
	| {
			type: typeof protocol.ControlPacketType.TRANSFER_CANCEL;
			envelope: Extract<
				ProtocolTransferCommandEnvelope,
				{ type: typeof protocol.ControlPacketType.TRANSFER_CANCEL }
			>;
			command: protocol.TransferCancelCommandPayload;
	  };

export interface ProtocolTransferCommandRejection {
	code: string;
	message: string;
}

export type ProtocolTransferCommandMapResult =
	| { ok: true; value: ProtocolTransferCommandMapping }
	| { ok: false; error: ProtocolTransferCommandRejection };

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object";
}

export function isControlPacketEnvelopeLike(value: unknown): value is protocol.ControlPacketEnvelope {
	return (
		isRecord(value) &&
		typeof value.protocolVersion === "number" &&
		typeof value.id === "string" &&
		typeof value.kind === "string" &&
		typeof value.type === "string" &&
		typeof value.sentAt === "string" &&
		"data" in value
	);
}

function hasString(value: Record<string, unknown>, key: string): boolean {
	return typeof value[key] === "string" && value[key].trim().length > 0;
}

function reject(message: string): ProtocolTransferCommandMapResult {
	return {
		ok: false,
		error: {
			code: "PROTOCOL_VIOLATION",
			message,
		},
	};
}

function isTransferOfferCommandPayload(data: unknown): data is protocol.TransferOfferCommandPayload {
	return (
		isRecord(data) &&
		hasString(data, "transferId") &&
		hasString(data, "senderDeviceId") &&
		hasString(data, "receiverDeviceId") &&
		typeof data.mode === "string" &&
		isRecord(data.manifest) &&
		Array.isArray(data.manifest.items)
	);
}

function isTransferAcceptCommandPayload(data: unknown): data is protocol.TransferAcceptCommandPayload {
	return isRecord(data) && hasString(data, "transferId") && hasString(data, "receiverDeviceId");
}

function isTransferRejectCommandPayload(data: unknown): data is protocol.TransferRejectCommandPayload {
	return isRecord(data) && hasString(data, "transferId");
}

function isTransferCancelCommandPayload(data: unknown): data is protocol.TransferCancelCommandPayload {
	return isRecord(data) && hasString(data, "transferId");
}

export function parseProtocolTransferCommandEnvelope(rawJson: string): ProtocolTransferCommandEnvelope | undefined {
	try {
		const parsed = JSON.parse(rawJson);
		return isControlPacketEnvelopeLike(parsed) ? (parsed as unknown as ProtocolTransferCommandEnvelope) : undefined;
	} catch {
		return undefined;
	}
}

export function shouldRouteProtocolTransferCommandEnvelope(
	connection: IConnection,
	envelope: protocol.ControlPacketEnvelope | undefined,
): boolean {
	return Boolean(
		envelope &&
			canEmitProtocolPackets(connection) &&
			envelope.protocolVersion === protocol.NEKO_PROTOCOL_VERSION &&
			envelope.kind === protocol.ControlPacketKind.COMMAND,
	);
}

export function mapProtocolTransferCommandEnvelope(
	connection: IConnection,
	envelope: protocol.ControlPacketEnvelope,
): ProtocolTransferCommandMapResult {
	// Protocol v1 inbound command path. This is opt-in only and is intentionally
	// separate from legacy FILE_* inbound compatibility handlers.
	if (!canEmitProtocolPackets(connection)) {
		return reject("Connection has not opted into Protocol v1 control packets");
	}

	if (envelope.protocolVersion !== protocol.NEKO_PROTOCOL_VERSION) {
		return reject("Unsupported Protocol v1 command envelope version");
	}

	if (envelope.kind !== protocol.ControlPacketKind.COMMAND) {
		return reject("Protocol v1 transfer envelope must be a COMMAND");
	}

	switch (envelope.type) {
		case protocol.ControlPacketType.TRANSFER_OFFER:
			if (!isTransferOfferCommandPayload(envelope.data)) {
				return reject("Invalid TRANSFER_OFFER command payload");
			}
			return {
				ok: true,
				value: {
					type: protocol.ControlPacketType.TRANSFER_OFFER,
					envelope: envelope as Extract<
						ProtocolTransferCommandEnvelope,
						{ type: typeof protocol.ControlPacketType.TRANSFER_OFFER }
					>,
					command: envelope.data,
				},
			};

		case protocol.ControlPacketType.TRANSFER_ACCEPT:
			if (!isTransferAcceptCommandPayload(envelope.data)) {
				return reject("Invalid TRANSFER_ACCEPT command payload");
			}
			return {
				ok: true,
				value: {
					type: protocol.ControlPacketType.TRANSFER_ACCEPT,
					envelope: envelope as Extract<
						ProtocolTransferCommandEnvelope,
						{ type: typeof protocol.ControlPacketType.TRANSFER_ACCEPT }
					>,
					command: envelope.data,
				},
			};

		case protocol.ControlPacketType.TRANSFER_REJECT:
			if (!isTransferRejectCommandPayload(envelope.data)) {
				return reject("Invalid TRANSFER_REJECT command payload");
			}
			return {
				ok: true,
				value: {
					type: protocol.ControlPacketType.TRANSFER_REJECT,
					envelope: envelope as Extract<
						ProtocolTransferCommandEnvelope,
						{ type: typeof protocol.ControlPacketType.TRANSFER_REJECT }
					>,
					command: envelope.data,
				},
			};

		case protocol.ControlPacketType.TRANSFER_CANCEL:
			if (!isTransferCancelCommandPayload(envelope.data)) {
				return reject("Invalid TRANSFER_CANCEL command payload");
			}
			return {
				ok: true,
				value: {
					type: protocol.ControlPacketType.TRANSFER_CANCEL,
					envelope: envelope as Extract<
						ProtocolTransferCommandEnvelope,
						{ type: typeof protocol.ControlPacketType.TRANSFER_CANCEL }
					>,
					command: envelope.data,
				},
			};

		default:
			return reject(`Unsupported Protocol v1 transfer command type: ${envelope.type}`);
	}
}

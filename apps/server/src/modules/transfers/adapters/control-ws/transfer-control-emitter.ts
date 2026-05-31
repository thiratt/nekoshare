import {
	mapTransferAcceptedEventToLegacyFileAccept,
	mapTransferOfferedEventToLegacyFileOffer,
	mapTransferRejectedEventToLegacyFileReject,
} from "./legacy-file-packet.mapper";
import type {
	TransferAcceptedEmission,
	TransferControlEmitContext,
	TransferFailureEmission,
	TransferOfferedEmission,
	TransferProgressEmission,
	TransferRejectedEmission,
} from "./transfer-control-emitter.types";

import {
	canEmitProtocolPackets,
	createErrorEnvelope,
	createEventEnvelope,
	sendProtocolControlPacket,
	shouldEmitLegacyFilePackets,
} from "@/infrastructure/socket/protocol";
import type { ConnectionTarget } from "@/infrastructure/socket/routing";
import { protocol } from "@workspace/contracts";
import { PacketType } from "@workspace/contracts/ws";

function targetCanEmitProtocolPackets(targetConnection: ConnectionTarget): boolean {
	return targetConnection.kind === "local" && canEmitProtocolPackets(targetConnection.connection);
}

function targetShouldEmitLegacyFilePackets(targetConnection: ConnectionTarget): boolean {
	return targetConnection.kind !== "local" || shouldEmitLegacyFilePackets(targetConnection.connection);
}

function sendProtocolEvent<TData>(
	targetConnection: ConnectionTarget,
	type: protocol.ControlPacketType,
	data: TData,
	traceId: string,
): void {
	if (targetConnection.kind !== "local") {
		return;
	}

	sendProtocolControlPacket(
		targetConnection.connection,
		createEventEnvelope(type, data, {
			traceId,
		}),
	);
}

export async function emitTransferOffered(
	context: TransferControlEmitContext,
	input: TransferOfferedEmission,
): Promise<boolean> {
	if (targetCanEmitProtocolPackets(context.targetConnection)) {
		// Protocol v1 emission path for opted-in local WebSocket clients.
		sendProtocolEvent(
			context.targetConnection,
			protocol.ControlPacketType.TRANSFER_OFFERED,
			input.event,
			input.event.transferId,
		);
	}

	if (!targetShouldEmitLegacyFilePackets(context.targetConnection)) {
		return false;
	}

	// Legacy FILE_* compatibility path for existing clients.
	const legacyPayload = mapTransferOfferedEventToLegacyFileOffer(input.event, input.legacy);
	return context.sendLegacyPacket(PacketType.FILE_OFFER, JSON.stringify(legacyPayload));
}

export async function emitTransferAccepted(
	context: TransferControlEmitContext,
	input: TransferAcceptedEmission,
): Promise<boolean> {
	if (targetCanEmitProtocolPackets(context.targetConnection)) {
		// Protocol v1 emission path for opted-in local WebSocket clients.
		sendProtocolEvent(
			context.targetConnection,
			protocol.ControlPacketType.TRANSFER_ACCEPTED,
			input.event,
			input.event.transferId,
		);
	}

	if (!targetShouldEmitLegacyFilePackets(context.targetConnection)) {
		return false;
	}

	// Legacy FILE_* compatibility path for existing clients.
	const legacyPayload = mapTransferAcceptedEventToLegacyFileAccept(input.event, input.legacy);
	return context.sendLegacyPacket(PacketType.FILE_ACCEPT, JSON.stringify(legacyPayload));
}

export async function emitTransferRejected(
	context: TransferControlEmitContext,
	input: TransferRejectedEmission,
): Promise<boolean> {
	if (targetCanEmitProtocolPackets(context.targetConnection)) {
		// Protocol v1 emission path for opted-in local WebSocket clients.
		sendProtocolEvent(
			context.targetConnection,
			protocol.ControlPacketType.TRANSFER_REJECTED,
			input.event,
			input.event.transferId,
		);
	}

	if (!targetShouldEmitLegacyFilePackets(context.targetConnection)) {
		return false;
	}

	// Legacy FILE_* compatibility path for existing clients.
	const legacyPayload = mapTransferRejectedEventToLegacyFileReject(input.event, input.legacy);
	return context.sendLegacyPacket(PacketType.FILE_REJECT, JSON.stringify(legacyPayload));
}

export async function emitTransferFailure(
	context: TransferControlEmitContext,
	input: TransferFailureEmission,
): Promise<boolean> {
	if (targetCanEmitProtocolPackets(context.targetConnection)) {
		// Protocol v1 failure emission path. Legacy ERROR_GENERIC compatibility remains elsewhere for now.
		if (context.targetConnection.kind === "local") {
			sendProtocolControlPacket(
				context.targetConnection.connection,
				createErrorEnvelope(
					protocol.ControlPacketType.TRANSFER_FAILED,
					{
						code: input.failure.code,
						message: input.failure.message,
						retryable: input.failure.retryable,
						details: input.failure.details,
					},
					{
						traceId: input.transferId,
					},
				),
			);
		}
	}

	return targetShouldEmitLegacyFilePackets(context.targetConnection);
}

export async function emitTransferProgress(
	context: TransferControlEmitContext,
	input: TransferProgressEmission,
): Promise<boolean> {
	if (targetCanEmitProtocolPackets(context.targetConnection)) {
		// Protocol v1 progress emission path. FILE_ACK wire behavior is preserved in the adapter for now.
		sendProtocolEvent(
			context.targetConnection,
			protocol.ControlPacketType.TRANSFER_PROGRESS_UPDATED,
			input.event,
			input.event.transferId,
		);
	}

	return targetShouldEmitLegacyFilePackets(context.targetConnection);
}

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

import { canEmitProtocolPackets, shouldEmitLegacyFilePackets } from "@/infrastructure/socket/protocol";
import type { ConnectionTarget } from "@/infrastructure/socket/routing";
import { PacketType } from "@workspace/contracts/ws";

function targetCanEmitProtocolPackets(targetConnection: ConnectionTarget): boolean {
	return targetConnection.kind === "local" && canEmitProtocolPackets(targetConnection.connection);
}

function targetShouldEmitLegacyFilePackets(targetConnection: ConnectionTarget): boolean {
	return targetConnection.kind !== "local" || shouldEmitLegacyFilePackets(targetConnection.connection);
}

export async function emitTransferOffered(
	context: TransferControlEmitContext,
	input: TransferOfferedEmission,
): Promise<boolean> {
	if (targetCanEmitProtocolPackets(context.targetConnection)) {
		// Protocol v1 emission branch. Step 15 will send a typed Protocol v1 envelope here.
	}

	if (!targetShouldEmitLegacyFilePackets(context.targetConnection)) {
		return false;
	}

	const legacyPayload = mapTransferOfferedEventToLegacyFileOffer(input.event, input.legacy);
	return context.sendLegacyPacket(PacketType.FILE_OFFER, JSON.stringify(legacyPayload));
}

export async function emitTransferAccepted(
	context: TransferControlEmitContext,
	input: TransferAcceptedEmission,
): Promise<boolean> {
	if (targetCanEmitProtocolPackets(context.targetConnection)) {
		// Protocol v1 emission branch. Step 15 will send a typed Protocol v1 envelope here.
	}

	if (!targetShouldEmitLegacyFilePackets(context.targetConnection)) {
		return false;
	}

	const legacyPayload = mapTransferAcceptedEventToLegacyFileAccept(input.event, input.legacy);
	return context.sendLegacyPacket(PacketType.FILE_ACCEPT, JSON.stringify(legacyPayload));
}

export async function emitTransferRejected(
	context: TransferControlEmitContext,
	input: TransferRejectedEmission,
): Promise<boolean> {
	if (targetCanEmitProtocolPackets(context.targetConnection)) {
		// Protocol v1 emission branch. Step 15 will send a typed Protocol v1 envelope here.
	}

	if (!targetShouldEmitLegacyFilePackets(context.targetConnection)) {
		return false;
	}

	const legacyPayload = mapTransferRejectedEventToLegacyFileReject(input.event, input.legacy);
	return context.sendLegacyPacket(PacketType.FILE_REJECT, JSON.stringify(legacyPayload));
}

export async function emitTransferFailure(
	context: TransferControlEmitContext,
	input: TransferFailureEmission,
): Promise<boolean> {
	if (targetCanEmitProtocolPackets(context.targetConnection)) {
		// Protocol v1 failure emission branch. Legacy ERROR_GENERIC compatibility remains elsewhere for now.
		void input;
	}

	return targetShouldEmitLegacyFilePackets(context.targetConnection);
}

export async function emitTransferProgress(
	context: TransferControlEmitContext,
	input: TransferProgressEmission,
): Promise<boolean> {
	if (targetCanEmitProtocolPackets(context.targetConnection)) {
		// Protocol v1 progress emission branch. FILE_ACK wire behavior is preserved in the adapter for now.
		void input;
	}

	return targetShouldEmitLegacyFilePackets(context.targetConnection);
}

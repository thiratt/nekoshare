import type {
	LegacyFileAcceptPacketPayload,
	LegacyFileAckMappingContext,
	LegacyFileAckPacketPayload,
	LegacyFileOfferPacketInput,
	LegacyFileOfferPacketPayload,
	LegacyFileRejectPacketInput,
	LegacyFileRejectPacketPayload,
	TransferAcceptedLegacyCompat,
	TransferOfferedLegacyCompat,
	TransferRejectedLegacyCompat,
} from "./legacy-file-packet.types";

import type { protocol } from "@workspace/contracts";

// FILE_* is legacy prototype compatibility. TRANSFER_* is Neko Protocol v1.
// This pure mapper is the migration boundary used by the control-WS adapter
// while preserving legacy FILE_* wire compatibility.

export function mapLegacyFileOfferToTransferOfferCommand(
	payload: LegacyFileOfferPacketInput,
): protocol.TransferOfferCommandPayload {
	return {
		transferId: payload.transferId,
		senderDeviceId: payload.fromDeviceId ?? "",
		receiverDeviceId: payload.toDeviceId,
		mode: "AUTO",
		manifest: {
			id: payload.transferId,
			items: payload.files.map((file, index) => ({
				id: `${payload.transferId}:file:${index}`,
				kind: "file",
				name: file.name,
				size: file.size,
				mimeType: file.extension ? undefined : undefined,
			})),
			totalBytes: payload.files.reduce((total, file) => total + file.size, 0),
			createdAt: new Date(0).toISOString(),
		},
	};
}

export function mapTransferOfferedEventToLegacyFileOffer(
	event: protocol.TransferOfferedEventPayload,
	compat: TransferOfferedLegacyCompat,
): LegacyFileOfferPacketPayload {
	// Compatibility-only FILE_OFFER fields live here until Protocol v1 socket
	// emission replaces the legacy wire payload.
	return {
		transferId: event.transferId,
		senderDeviceId: event.senderDeviceId,
		senderDeviceFingerprint: compat.senderDeviceFingerprint ?? "",
		senderDeviceName: compat.senderDeviceName,
		senderUserId: compat.senderUserId,
		senderUserName: compat.senderUserName,
		files: compat.files,
	};
}

export function mapLegacyFileAcceptToTransferAcceptCommand(
	payload: LegacyFileAcceptPacketPayload,
): protocol.TransferAcceptCommandPayload {
	return {
		transferId: payload.transferId,
		receiverDeviceId: payload.receiverDeviceId,
	};
}

export function mapTransferAcceptedEventToLegacyFileAccept(
	event: protocol.TransferAcceptedEventPayload,
	compat: TransferAcceptedLegacyCompat,
): LegacyFileAcceptPacketPayload {
	// Compatibility-only FILE_ACCEPT listener fields live here until Protocol v1
	// socket emission can carry transport readiness directly.
	return {
		transferId: event.transferId,
		senderDeviceId: compat.senderDeviceId,
		receiverDeviceId: event.receiverDeviceId,
		receiverFingerprint: compat.receiverFingerprint ?? "",
		address: compat.address,
		port: compat.port,
	};
}

export function mapLegacyFileRejectToTransferRejectCommand(
	payload: LegacyFileRejectPacketInput,
): protocol.TransferRejectCommandPayload {
	return {
		transferId: payload.transferId,
		reason: payload.reason,
	};
}

export function mapTransferRejectedEventToLegacyFileReject(
	event: protocol.TransferRejectedEventPayload,
	compat: TransferRejectedLegacyCompat,
): LegacyFileRejectPacketPayload {
	// Legacy FILE_REJECT identifies the sender device on the payload; Protocol v1
	// keeps that as routing/context instead of event core data.
	return {
		transferId: event.transferId,
		senderDeviceId: compat.senderDeviceId,
		reason: event.reason,
	};
}

export function mapLegacyFileAckToTransferStatusOrProgress(
	payload: LegacyFileAckPacketPayload,
	context: LegacyFileAckMappingContext,
): protocol.TransferStatusEventPayload | protocol.TransferProgressEventPayload {
	const updatedAt = context.updatedAt ?? new Date(0).toISOString();
	const progress = payload as Record<string, unknown>;

	if (hasNumber(progress.totalBytes)) {
		return {
			transferId: context.transferId,
			totalBytes: progress.totalBytes,
			bytesTransferred: firstNumber(progress.bytesAcknowledged, progress.bytesReceived, progress.bytesSent) ?? 0,
			bytesAcknowledged: numberOrUndefined(progress.bytesAcknowledged),
			currentFileId: stringOrUndefined(progress.currentFileId),
			filesCompleted: numberOrUndefined(progress.filesCompleted),
			updatedAt,
		};
	}

	return {
		transferId: context.transferId,
		status: isSuccessfulLegacyAck(payload) ? "TRANSFERRING" : "FAILED",
		message: stringOrUndefined((payload as Record<string, unknown>).message),
		updatedAt,
	};
}

function isSuccessfulLegacyAck(payload: LegacyFileAckPacketPayload): boolean {
	return "success" in payload ? payload.success : true;
}

function hasNumber(value: unknown): value is number {
	return typeof value === "number" && Number.isFinite(value);
}

function numberOrUndefined(value: unknown): number | undefined {
	return hasNumber(value) ? value : undefined;
}

function firstNumber(...values: unknown[]): number | undefined {
	return values.find(hasNumber);
}

function stringOrUndefined(value: unknown): string | undefined {
	return typeof value === "string" ? value : undefined;
}

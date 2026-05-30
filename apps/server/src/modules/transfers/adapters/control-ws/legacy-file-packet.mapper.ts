import type {
	LegacyFileAcceptPacketPayload,
	LegacyFileAckMappingContext,
	LegacyFileAckPacketPayload,
	LegacyFileOfferPacketInput,
	LegacyFileOfferPacketPayload,
	LegacyFileRejectPacketInput,
	LegacyFileRejectPacketPayload,
	TransferAcceptedEventLegacyCompat,
	TransferOfferedEventLegacyCompat,
	TransferRejectedEventLegacyCompat,
} from "./legacy-file-packet.types";

import type { protocol } from "@workspace/contracts";

// FILE_* is legacy prototype compatibility. TRANSFER_* is Neko Protocol v1.
// This pure mapper is the migration boundary and is intentionally not wired
// into the current socket handlers yet.

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
	event: TransferOfferedEventLegacyCompat,
): LegacyFileOfferPacketPayload {
	return {
		transferId: event.transferId,
		senderDeviceId: event.senderDeviceId,
		senderDeviceFingerprint: event.senderDeviceFingerprint,
		senderDeviceName: event.senderDeviceName,
		senderUserId: event.senderUserId,
		senderUserName: event.senderUserName,
		files: event.files,
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
	event: TransferAcceptedEventLegacyCompat,
): LegacyFileAcceptPacketPayload {
	return {
		transferId: event.transferId,
		senderDeviceId: event.senderDeviceId,
		receiverDeviceId: event.receiverDeviceId,
		receiverFingerprint: event.receiverFingerprint,
		address: event.address,
		port: event.port,
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
	event: TransferRejectedEventLegacyCompat,
): LegacyFileRejectPacketPayload {
	return {
		transferId: event.transferId,
		senderDeviceId: event.senderDeviceId,
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

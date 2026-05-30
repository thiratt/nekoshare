import type { protocol } from "@workspace/contracts";
import type {
	AckPayload,
	FileAcceptPayload,
	FileMetadata,
	FileOfferPayload,
	FileRejectPayload,
} from "@workspace/contracts/ws";

// FILE_* is legacy prototype compatibility. These types document the current
// control-WS packet shapes without changing the active socket handlers.
export interface LegacyFileOfferPacketInput {
	transferId: string;
	fromDeviceId?: string;
	toDeviceId: string;
	files: FileMetadata[];
}

export type LegacyFileOfferPacketPayload = FileOfferPayload;
export type LegacyFileAcceptPacketPayload = FileAcceptPayload;
export type LegacyFileRejectPacketPayload = FileRejectPayload;

export interface LegacyFileRejectPacketInput extends FileRejectPayload {
	reason?: string;
}

export interface LegacyFileProgressAckPayload {
	transferId?: string;
	totalBytes?: number;
	bytesSent?: number;
	bytesReceived?: number;
	bytesAcknowledged?: number;
	filesCompleted?: number;
	currentFileId?: string;
	message?: string;
}

export type LegacyFileAckPacketPayload = AckPayload | LegacyFileProgressAckPayload;

// TRANSFER_* is Neko Protocol v1. These compatibility event inputs carry the
// legacy-only fields needed to round-trip back to unchanged FILE_* payloads.
export interface TransferOfferedEventLegacyCompat extends protocol.TransferOfferedEventPayload {
	senderDeviceFingerprint: string;
	senderDeviceName?: string | null;
	senderUserId?: string | null;
	senderUserName?: string | null;
	files: FileMetadata[];
}

export interface TransferAcceptedEventLegacyCompat extends protocol.TransferAcceptedEventPayload {
	senderDeviceId: string;
	receiverFingerprint: string;
	address: string;
	port: number;
}

export interface TransferRejectedEventLegacyCompat extends protocol.TransferRejectedEventPayload {
	senderDeviceId: string;
}

export interface LegacyFileAckMappingContext {
	transferId: string;
	updatedAt?: string;
}

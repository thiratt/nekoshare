import type { protocol } from "@workspace/contracts";
import type {
	AckPayload,
	FileAcceptPayload,
	FileMetadata,
	FileOfferPayload,
	FileRejectPayload,
} from "@workspace/contracts/ws";

export interface LegacyFileMetadata extends Omit<FileMetadata, "path"> {
	path?: string;
}

// FILE_* is legacy prototype compatibility. These types document the current
// control-WS packet shapes without changing the active socket handlers.
export interface LegacyFileOfferPacketInput {
	transferId: string;
	fromDeviceId?: string;
	toDeviceId: string;
	files: LegacyFileMetadata[];
}

export interface LegacyFileOfferPacketPayload extends Omit<FileOfferPayload, "files"> {
	files: LegacyFileMetadata[];
}
export type LegacyFileAcceptPacketPayload = FileAcceptPayload;
export interface LegacyFileRejectPacketPayload extends FileRejectPayload {
	reason?: string;
}

export type LegacyFileRejectPacketInput = LegacyFileRejectPacketPayload;

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
export interface TransferOfferedLegacyCompat {
	senderDeviceFingerprint?: string | null;
	senderDeviceName?: string | null;
	senderUserId?: string | null;
	senderUserName?: string | null;
	files: LegacyFileMetadata[];
}

export interface TransferAcceptedLegacyCompat {
	senderDeviceId: string;
	receiverFingerprint?: string | null;
	address: string;
	port: number;
}

export interface TransferRejectedLegacyCompat {
	senderDeviceId: string;
}

export interface LegacyFileAckMappingContext {
	transferId: string;
	updatedAt?: string;
}

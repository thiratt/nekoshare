import type { TransferStatus } from "./transfer-status";
import type { TransferTransport } from "./transfer-transport";

export interface TransferOfferedEventPayload {
	transferId: string;
	senderDeviceId: string;
	receiverDeviceId: string;
}

export interface TransferAcceptedEventPayload {
	transferId: string;
	receiverDeviceId: string;
}

export interface TransferRejectedEventPayload {
	transferId: string;
	reason?: string;
}

export interface TransferStatusEventPayload {
	transferId: string;
	status: TransferStatus;
	message?: string;
	updatedAt: string;
}

export interface TransferProgressEventPayload {
	transferId: string;
	totalBytes: number;
	bytesTransferred: number;
	bytesAcknowledged?: number;
	currentFileId?: string;
	filesCompleted?: number;
	updatedAt: string;
}

export interface TransferTransportEventPayload {
	transferId: string;
	transport: TransferTransport;
	updatedAt: string;
}

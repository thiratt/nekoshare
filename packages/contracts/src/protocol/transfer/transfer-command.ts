import type { TransferMode } from "./transfer-mode";
import type { TransferManifest } from "./transfer-manifest";

export interface TransferOfferCommandPayload {
	transferId: string;
	senderDeviceId: string;
	receiverDeviceId: string;
	mode: TransferMode;
	manifest: TransferManifest;
	expiresAt?: string;
}

export interface TransferAcceptCommandPayload {
	transferId: string;
	receiverDeviceId: string;
}

export interface TransferRejectCommandPayload {
	transferId: string;
	reason?: string;
}

export interface TransferCancelCommandPayload {
	transferId: string;
	reason?: string;
}

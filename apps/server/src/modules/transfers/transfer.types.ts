import type { TransferRelayTicket } from "@workspace/contracts";

export type {
	TransferErrorCode,
	TransferFileMetadata,
	TransferParticipant,
	TransferParticipantRole,
	TransferProgress,
	TransferRelayTicket,
	TransferRequestedTransport,
	TransferRuntime,
	TransferRuntimeEvent,
	TransferStatus,
	TransferTransportMode,
	TransferTransportState,
} from "@workspace/contracts";

export interface TransferRuntimeStoreOptions {
	sessionTtlSeconds: number;
	eventTtlSeconds: number;
	relayTicketTtlSeconds: number;
}

export type TransferSessionState = "offered" | "accepted";

export interface TransferSessionRecord {
	transferId: string;
	senderDeviceId: string;
	receiverDeviceId: string;
	state: TransferSessionState;
	updatedAt: number;
}

export interface StoredTransferRelayTicket extends TransferRelayTicket {
	tokenHash: string;
	ttlSeconds: number;
}

export interface IssuedTransferRelayTicket {
	token: string;
	ticket: TransferRelayTicket;
}

export interface VerifiedTransferRelayTicket {
	ticket: TransferRelayTicket;
}

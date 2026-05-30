export type TransferStatus =
	| "offered"
	| "accepted"
	| "connecting"
	| "transferring"
	| "paused"
	| "completed"
	| "rejected"
	| "cancelled"
	| "failed"
	| "expired";

export type TransferRequestedTransport = "auto" | "lan-direct" | "relay";

export type TransferTransportMode = "lan-direct" | "relay" | "unknown";

export type TransferTransportState =
	| "none"
	| "preparing"
	| "listener-ready"
	| "ticket-issued"
	| "waiting-peer"
	| "connected"
	| "failed";

export type TransferParticipantRole = "sender" | "receiver";

export interface TransferParticipant {
	userId: string;
	deviceId: string;
	deviceName?: string | null;
	deviceFingerprint?: string | null;
	role: TransferParticipantRole;
}

export interface TransferFileMetadata {
	id?: string;
	name: string;
	size: number;
	extension?: string;
	relativePath?: string;
	mimeType?: string;
}

export interface TransferProgress {
	totalBytes: number;
	bytesSent: number;
	bytesReceived: number;
	bytesAcknowledged: number;
	fileCount: number;
	filesCompleted: number;
	updatedAt: string;
}

export interface TransferRelayTicket {
	id: string;
	transferId: string;
	role: TransferParticipantRole;
	userId: string;
	deviceId: string;
	issuer: "server";
	transport: Extract<TransferTransportMode, "relay">;
	byteLimit: number;
	expiresAt: string;
	issuedAt: string;
}

export interface TransferRuntime {
	transferId: string;
	status: TransferStatus;
	requestedTransport: TransferRequestedTransport;
	transport: TransferTransportMode;
	transportState: TransferTransportState;
	sender: TransferParticipant;
	receiver: TransferParticipant;
	files: TransferFileMetadata[];
	progress: TransferProgress;
	relayTicket?: TransferRelayTicket;
	errorCode?: TransferErrorCode;
	errorMessage?: string;
	createdAt: string;
	updatedAt: string;
	expiresAt?: string;
}

export type TransferRuntimeEventType =
	| "status-changed"
	| "transport-changed"
	| "progress-updated"
	| "relay-ticket-issued"
	| "error";

export interface TransferRuntimeEvent {
	id: string;
	transferId: string;
	type: TransferRuntimeEventType;
	status?: TransferStatus;
	transport?: TransferTransportMode;
	transportState?: TransferTransportState;
	progress?: TransferProgress;
	errorCode?: TransferErrorCode;
	message?: string;
	createdAt: string;
}

export type TransferErrorCode =
	| "TRANSFER_NOT_FOUND"
	| "TRANSFER_INVALID_STATE"
	| "TRANSFER_UNAUTHORIZED_DEVICE"
	| "TRANSFER_TARGET_OFFLINE"
	| "TRANSFER_RELAY_TICKET_EXPIRED"
	| "TRANSFER_RELAY_LIMIT_EXCEEDED"
	| "TRANSFER_PAYLOAD_INVALID"
	| "TRANSFER_INTERNAL_ERROR"
	| "NETWORK_LOST"
	| "DEVICE_REVOKED"
	| "RELAY_DISCONNECTED"
	| "CHECKSUM_MISMATCH"
	| "FILE_TOO_LARGE"
	| "PERMISSION_DENIED";

export type {
	TransferErrorCode,
	TransferFileMetadata,
	TransferParticipant,
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
}

import type {
	StoredTransferRelayTicket,
	TransferProgress,
	TransferRuntime,
	TransferRuntimeEvent,
	TransferSessionRecord,
} from "./transfer.types";

export interface TransferRuntimeStore {
	getTransferSession(transferId: string): Promise<TransferSessionRecord | undefined>;
	saveTransferSession(session: TransferSessionRecord): Promise<void>;
	removeTransferSession(session: TransferSessionRecord): Promise<void>;
	removeTransferSessionById(transferId: string): Promise<void>;
	findAcceptedTransferSessionsByPair(deviceA: string, deviceB: string): Promise<TransferSessionRecord[]>;
	getRuntime(transferId: string): Promise<TransferRuntime | undefined>;
	saveRuntime(runtime: TransferRuntime): Promise<void>;
	removeRuntime(transferId: string): Promise<void>;
	getProgress(transferId: string): Promise<TransferProgress | undefined>;
	saveProgress(transferId: string, progress: TransferProgress): Promise<void>;
	getRelayTicket(ticketId: string): Promise<StoredTransferRelayTicket | undefined>;
	addRelayTicket(ticket: StoredTransferRelayTicket): Promise<void>;
	addEvent(event: TransferRuntimeEvent): Promise<void>;
	listRecentEvents(transferId: string, limit?: number): Promise<TransferRuntimeEvent[]>;
}

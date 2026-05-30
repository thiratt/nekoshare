import type { TransferParticipantRole } from "@/modules/transfers";

export interface RelayPeerIdentity {
	transferId: string;
	role: TransferParticipantRole;
	userId: string;
	deviceId: string;
}

export interface RelayPeer extends RelayPeerIdentity {
	connectionId: string;
	connectedAt: string;
	close(reason: string): void;
	sendBinary(data: ArrayBuffer | Buffer): void;
}

export interface RelayTransferSession {
	transferId: string;
	sender?: RelayPeer;
	receiver?: RelayPeer;
	bytesRelayed: number;
	lastProgressAt: number;
	lastProgressBytes: number;
}

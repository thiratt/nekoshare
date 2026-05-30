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
}

export interface RelayTransferSession {
	transferId: string;
	sender?: RelayPeer;
	receiver?: RelayPeer;
}

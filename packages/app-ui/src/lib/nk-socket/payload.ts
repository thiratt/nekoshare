import { ApiDevice } from "@workspace/app-ui/types/device";

export interface SocketDeviceUpdatedPayload {
	id: string;
	name: string;
}

// Re-use ApiDevice but new name for clarity
export interface SocketDeviceAddedPayload extends Omit<ApiDevice, "lastActiveAt"> {
	lastActiveAt: Date;
}

export interface SocketDeviceRemovedPayload {
	id: string;
	deviceIdentifier?: string | null;
	terminatedBy: string;
}

export interface SocketDevicePresencePayload {
	deviceId: string;
	deviceIdentifier?: string;
}

export interface PeerConnectResponsePayload {
	readonly success: boolean;
	readonly status: "pending" | "failed" | "duplicate";
	readonly requestId?: string;
	readonly message: string;
}

export interface PeerIncomingRequestPayload {
	readonly requestId: string;
	readonly sourceDeviceId: string;
	readonly sourceDeviceName: string;
	readonly sourceIp: string;
	readonly fingerprint: string;
}

export interface PeerConnectionInfoPayload {
	readonly requestId: string;
	readonly ip: string;
	readonly port: number;
	readonly deviceName: string;
	readonly fingerprint: string;
}

export interface PeerSocketReadyResponsePayload {
	readonly success: boolean;
	readonly message: string;
}

export interface PeerDisconnectedPayload {
	readonly deviceId: string;
	readonly reason: string;
}

export interface AckPayload {
	readonly success: boolean;
	readonly message: string;
}

export interface ErrorPayload {
	readonly message: string;
	readonly code?: string;
}

export interface FriendRequestReceivedPayload {
	readonly friendId: string;
	readonly user: {
		readonly id: string;
		readonly name: string;
		readonly email: string;
		readonly avatarUrl?: string;
	};
	readonly createdAt: string;
}

export interface FriendRequestAcceptedPayload {
	readonly friendId: string;
	readonly user: {
		readonly id: string;
		readonly name: string;
		readonly email: string;
		readonly avatarUrl?: string;
	};
}

export interface FriendRequestRejectedPayload {
	readonly friendId: string;
}

export interface FriendRequestCancelledPayload {
	readonly friendId: string;
}

export interface FriendRemovedPayload {
	readonly friendId: string;
}

export interface FriendPresencePayload {
	readonly userId: string;
}

export interface FileOfferPayload {
	readonly transferId: string;
	readonly senderDeviceId: string;
	readonly senderDeviceFingerprint: string;
	readonly files: FileMetadata[];
}

export interface FileMetadata {
	readonly name: string;
	readonly size: number;
	readonly extension: string;
	readonly path: string;
}

export interface FileAcceptPayload {
	readonly transferId: string;
	readonly senderDeviceId: string;
	readonly receiverFingerprint: string;
	readonly receiverDeviceId: string;
	readonly address: string;
	readonly port: number;
}

export interface FileRejectPayload {
	readonly transferId: string;
	readonly senderDeviceId: string;
}

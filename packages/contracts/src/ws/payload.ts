import type { Device } from "../api/device";

export interface UserDeviceInfoPacket {
	deviceName: string;
}

export interface SocketDeviceUpdatedPayload {
	id: string;
	name: string;
}

export interface SocketDeviceAddedPayload extends Omit<Device, "lastActiveAt"> {
	lastActiveAt: Device["lastActiveAt"];
}

export interface SocketDeviceRemovedPayload {
	id: string;
	fingerprint?: string | null;
	terminatedBy: string;
}

export interface SocketDevicePresencePayload {
	deviceId: string;
}

export interface PeerConnectRequestPayload {
	targetDeviceId: string;
}

export interface PeerConnectResponsePayload {
	success: boolean;
	status: "pending" | "failed" | "duplicate";
	requestId?: string;
	message: string;
}

export interface PeerIncomingRequestPayload {
	requestId: string;
	sourceDeviceId: string;
	sourceDeviceName: string;
	sourceIp: string;
	fingerprint: string;
}

export interface PeerSocketReadyPayload {
	requestId: string;
	port: number;
}

export interface PeerConnectionInfoPayload {
	requestId: string;
	ip: string;
	port: number;
	deviceName: string;
	fingerprint: string;
}

export interface PeerSocketReadyResponsePayload {
	success: boolean;
	message: string;
}

export interface PeerConnectionConfirmPayload {
	requestId: string;
}

export interface PeerDisconnectPayload {
	targetDeviceId: string;
	reason?: string;
}

export interface PeerDisconnectedPayload {
	deviceId: string;
	reason: string;
}

export interface AckPayload {
	success: boolean;
	message: string;
}

export interface ErrorPayload {
	message: string;
	code?: string;
}

export interface FriendRequestReceivedPayload {
	friendId: string;
	user: {
		id: string;
		name: string;
		email: string;
		avatarUrl?: string;
	};
	createdAt: string;
}

export interface FriendRequestAcceptedPayload {
	friendId: string;
	user: {
		id: string;
		name: string;
		email: string;
		avatarUrl?: string;
	};
}

export interface FriendRequestRejectedPayload {
	friendId: string;
}

export interface FriendRequestCancelledPayload {
	friendId: string;
}

export interface FriendRemovedPayload {
	friendId: string;
}

export interface FriendPresencePayload {
	userId: string;
}

export interface FileMetadata {
	name: string;
	size: number;
	extension: string;
	path: string;
}

export interface FileOfferPayload {
	transferId: string;
	senderDeviceId: string;
	senderDeviceFingerprint: string;
	senderDeviceName?: string | null;
	senderUserId?: string | null;
	senderUserName?: string | null;
	files: FileMetadata[];
}

export interface FileAcceptPayload {
	transferId: string;
	senderDeviceId: string;
	receiverFingerprint: string;
	receiverDeviceId: string;
	address: string;
	port: number;
}

export interface FileRejectPayload {
	transferId: string;
	senderDeviceId: string;
}

export interface WsJsonEnvelope<TPayload> {
	payload: TPayload;
	requestId?: number;
}

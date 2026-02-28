import type {
	FriendPresencePayload as WsFriendPresencePayload,
	FriendRequestAcceptedPayload,
	FriendRequestReceivedPayload,
	SocketDevicePresencePayload,
} from "@workspace/contracts/ws";

export type FriendRequestPayload = FriendRequestReceivedPayload;
export type FriendAcceptedPayload = FriendRequestAcceptedPayload;
export type FriendIdPayload = { friendId: string };
export type FriendPresencePayload = WsFriendPresencePayload;
export type DevicePresencePayload = SocketDevicePresencePayload;

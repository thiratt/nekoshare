import { Logger } from "@/infrastructure/logger";
import { PacketType } from "@workspace/contracts/ws";

import { getUserSessions, sendJsonToSessions } from "./friend.gateway";
import { friendRepository } from "./friend.repository";
import type {
	DevicePresencePayload,
	FriendAcceptedPayload,
	FriendIdPayload,
	FriendPresencePayload,
	FriendRequestPayload,
} from "./friend.types";

export async function getUserFriendIds(userId: string): Promise<string[]> {
	const links = await friendRepository.listAcceptedFriendLinks(userId);
	return links.map((entry) => (entry.userLowId === userId ? entry.userHighId : entry.userLowId));
}

export function broadcastFriendRequestReceived(targetUserId: string, payload: FriendRequestPayload): void {
	const sessions = getUserSessions(targetUserId);
	if (sessions.length === 0) {
		Logger.debug("WebSocket", `No active sessions for user ${targetUserId} to receive friend request`);
		return;
	}

	const sent = sendJsonToSessions(targetUserId, PacketType.FRIEND_REQUEST_RECEIVED, JSON.stringify(payload));
	Logger.debug("WebSocket", `Broadcasted FRIEND_REQUEST_RECEIVED to ${sent} sessions for user ${targetUserId}`);
}

export function broadcastFriendRequestAccepted(targetUserId: string, payload: FriendAcceptedPayload): void {
	const sessions = getUserSessions(targetUserId);
	if (sessions.length === 0) {
		Logger.debug("WebSocket", `No active sessions for user ${targetUserId} to receive friend accepted`);
		return;
	}

	const sent = sendJsonToSessions(targetUserId, PacketType.FRIEND_REQUEST_ACCEPTED, JSON.stringify(payload));
	Logger.debug("WebSocket", `Broadcasted FRIEND_REQUEST_ACCEPTED to ${sent} sessions for user ${targetUserId}`);
}

export function broadcastFriendRequestRejected(targetUserId: string, payload: FriendIdPayload): void {
	const sent = sendJsonToSessions(targetUserId, PacketType.FRIEND_REQUEST_REJECTED, JSON.stringify(payload));
	if (sent > 0) {
		Logger.debug("WebSocket", `Broadcasted FRIEND_REQUEST_REJECTED to ${sent} sessions for user ${targetUserId}`);
	}
}

export function broadcastFriendRequestCancelled(targetUserId: string, payload: FriendIdPayload): void {
	const sent = sendJsonToSessions(targetUserId, PacketType.FRIEND_REQUEST_CANCELLED, JSON.stringify(payload));
	if (sent > 0) {
		Logger.debug("WebSocket", `Broadcasted FRIEND_REQUEST_CANCELLED to ${sent} sessions for user ${targetUserId}`);
	}
}

export function broadcastFriendRemoved(targetUserId: string, payload: FriendIdPayload): void {
	const sent = sendJsonToSessions(targetUserId, PacketType.FRIEND_REMOVED, JSON.stringify(payload));
	if (sent > 0) {
		Logger.debug("WebSocket", `Broadcasted FRIEND_REMOVED to ${sent} sessions for user ${targetUserId}`);
	}
}

export function broadcastUserOnline(userId: string, friendUserIds: string[]): void {
	const payload: FriendPresencePayload = { userId };
	const payloadJson = JSON.stringify(payload);

	for (const friendUserId of friendUserIds) {
		sendJsonToSessions(friendUserId, PacketType.FRIEND_ONLINE, payloadJson);
	}

	if (friendUserIds.length > 0) {
		Logger.debug("WebSocket", `Broadcasted FRIEND_ONLINE for user ${userId} to ${friendUserIds.length} friends`);
	}
}

export function broadcastUserOffline(userId: string, friendUserIds: string[]): void {
	const payload: FriendPresencePayload = { userId };
	const payloadJson = JSON.stringify(payload);

	for (const friendUserId of friendUserIds) {
		sendJsonToSessions(friendUserId, PacketType.FRIEND_OFFLINE, payloadJson);
	}

	if (friendUserIds.length > 0) {
		Logger.debug("WebSocket", `Broadcasted FRIEND_OFFLINE for user ${userId} to ${friendUserIds.length} friends`);
	}
}

export function broadcastDeviceOnline(userId: string, deviceId: string, excludeConnectionId?: string): void {
	const payload: DevicePresencePayload = { deviceId };
	const sent = sendJsonToSessions(userId, PacketType.DEVICE_ONLINE, JSON.stringify(payload), {
		excludeConnectionId,
	});

	Logger.debug("WebSocket", `Broadcasted DEVICE_ONLINE for device ${deviceId} to ${sent} sessions of user ${userId}`);
}

export function broadcastDeviceOffline(userId: string, deviceId: string): void {
	const payload: DevicePresencePayload = { deviceId };
	const sent = sendJsonToSessions(userId, PacketType.DEVICE_OFFLINE, JSON.stringify(payload));

	if (sent > 0) {
		Logger.debug(
			"WebSocket",
			`Broadcasted DEVICE_OFFLINE for device ${deviceId} to ${sent} sessions of user ${userId}`,
		);
	}
}

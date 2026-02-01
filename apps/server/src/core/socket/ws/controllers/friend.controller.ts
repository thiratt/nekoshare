import { eq, or, and } from "drizzle-orm";
import { db } from "@/adapters/db";
import { friend } from "@/adapters/db/schemas";
import { wsSessionManager } from "../../ws/connection";
import { PacketType } from "../../shared/protocol";
import { Logger } from "@/core/logger";

export async function getUserFriendIds(userId: string): Promise<string[]> {
	const friends = await db.query.friend.findMany({
		where: and(or(eq(friend.requesterId, userId), eq(friend.receiverId, userId)), eq(friend.status, "accepted")),
		columns: {
			requesterId: true,
			receiverId: true,
		},
	});

	return friends.map((f) => (f.requesterId === userId ? f.receiverId : f.requesterId));
}

export interface FriendRequestPayload {
	friendId: string;
	user: {
		id: string;
		name: string;
		email: string;
		avatarUrl?: string;
	};
	createdAt: string;
}

export interface FriendAcceptedPayload {
	friendId: string;
	user: {
		id: string;
		name: string;
		email: string;
		avatarUrl?: string;
	};
}

export interface FriendIdPayload {
	friendId: string;
}

export function broadcastFriendRequestReceived(targetUserId: string, payload: FriendRequestPayload): void {
	const sessions = wsSessionManager.getSessionsByUserId(targetUserId);
	if (sessions.length === 0) {
		Logger.debug("WebSocket", `No active sessions for user ${targetUserId} to receive friend request`);
		return;
	}

	const jsonPayload = JSON.stringify(payload);
	for (const session of sessions) {
		session.sendPacket(PacketType.FRIEND_REQUEST_RECEIVED, (w) => w.writeString(jsonPayload));
	}
	Logger.debug(
		"WebSocket",
		`Broadcasted FRIEND_REQUEST_RECEIVED to ${sessions.length} sessions for user ${targetUserId}`,
	);
}

export function broadcastFriendRequestAccepted(targetUserId: string, payload: FriendAcceptedPayload): void {
	const sessions = wsSessionManager.getSessionsByUserId(targetUserId);
	if (sessions.length === 0) {
		Logger.debug("WebSocket", `No active sessions for user ${targetUserId} to receive friend accepted`);
		return;
	}

	const jsonPayload = JSON.stringify(payload);
	for (const session of sessions) {
		session.sendPacket(PacketType.FRIEND_REQUEST_ACCEPTED, (w) => w.writeString(jsonPayload));
	}
	Logger.debug(
		"WebSocket",
		`Broadcasted FRIEND_REQUEST_ACCEPTED to ${sessions.length} sessions for user ${targetUserId}`,
	);
}

export function broadcastFriendRequestRejected(targetUserId: string, payload: FriendIdPayload): void {
	const sessions = wsSessionManager.getSessionsByUserId(targetUserId);
	if (sessions.length === 0) return;

	const jsonPayload = JSON.stringify(payload);
	for (const session of sessions) {
		session.sendPacket(PacketType.FRIEND_REQUEST_REJECTED, (w) => w.writeString(jsonPayload));
	}
	Logger.debug(
		"WebSocket",
		`Broadcasted FRIEND_REQUEST_REJECTED to ${sessions.length} sessions for user ${targetUserId}`,
	);
}

export function broadcastFriendRequestCancelled(targetUserId: string, payload: FriendIdPayload): void {
	const sessions = wsSessionManager.getSessionsByUserId(targetUserId);
	if (sessions.length === 0) return;

	const jsonPayload = JSON.stringify(payload);
	for (const session of sessions) {
		session.sendPacket(PacketType.FRIEND_REQUEST_CANCELLED, (w) => w.writeString(jsonPayload));
	}
	Logger.debug(
		"WebSocket",
		`Broadcasted FRIEND_REQUEST_CANCELLED to ${sessions.length} sessions for user ${targetUserId}`,
	);
}

export function broadcastFriendRemoved(targetUserId: string, payload: FriendIdPayload): void {
	const sessions = wsSessionManager.getSessionsByUserId(targetUserId);
	if (sessions.length === 0) return;

	const jsonPayload = JSON.stringify(payload);
	for (const session of sessions) {
		session.sendPacket(PacketType.FRIEND_REMOVED, (w) => w.writeString(jsonPayload));
	}
	Logger.debug("WebSocket", `Broadcasted FRIEND_REMOVED to ${sessions.length} sessions for user ${targetUserId}`);
}

export interface FriendPresencePayload {
	odiserId: string;
}

export function broadcastUserOnline(userId: string, friendUserIds: string[]): void {
	const payload = JSON.stringify({ userId });

	for (const friendUserId of friendUserIds) {
		const sessions = wsSessionManager.getSessionsByUserId(friendUserId);
		for (const session of sessions) {
			session.sendPacket(PacketType.FRIEND_ONLINE, (w) => w.writeString(payload));
		}
	}

	if (friendUserIds.length > 0) {
		Logger.debug("WebSocket", `Broadcasted FRIEND_ONLINE for user ${userId} to ${friendUserIds.length} friends`);
	}
}

export function broadcastUserOffline(userId: string, friendUserIds: string[]): void {
	const payload = JSON.stringify({ userId });

	for (const friendUserId of friendUserIds) {
		const sessions = wsSessionManager.getSessionsByUserId(friendUserId);
		for (const session of sessions) {
			session.sendPacket(PacketType.FRIEND_OFFLINE, (w) => w.writeString(payload));
		}
	}

	if (friendUserIds.length > 0) {
		Logger.debug("WebSocket", `Broadcasted FRIEND_OFFLINE for user ${userId} to ${friendUserIds.length} friends`);
	}
}

export interface DevicePresencePayload {
	deviceId: string;
	deviceIdentifier?: string;
}

export function broadcastDeviceOnline(
	userId: string,
	deviceId: string,
	deviceIdentifier?: string,
	excludeConnectionId?: string,
): void {
	const sessions = wsSessionManager.getSessionsByUserId(userId);
	if (sessions.length === 0) return;

	const payload = JSON.stringify({ deviceId, deviceIdentifier });

	for (const session of sessions) {
		if (excludeConnectionId && session.id === excludeConnectionId) continue;
		session.sendPacket(PacketType.DEVICE_ONLINE, (w) => w.writeString(payload));
	}

	Logger.debug(
		"WebSocket",
		`Broadcasted DEVICE_ONLINE for device ${deviceId} to ${sessions.length - 1} other sessions of user ${userId}`,
	);
}

export function broadcastDeviceOffline(userId: string, deviceId: string, deviceIdentifier?: string): void {
	const sessions = wsSessionManager.getSessionsByUserId(userId);
	if (sessions.length === 0) return;

	const payload = JSON.stringify({ deviceId, deviceIdentifier });

	for (const session of sessions) {
		session.sendPacket(PacketType.DEVICE_OFFLINE, (w) => w.writeString(payload));
	}

	Logger.debug(
		"WebSocket",
		`Broadcasted DEVICE_OFFLINE for device ${deviceId} to ${sessions.length} sessions of user ${userId}`,
	);
}

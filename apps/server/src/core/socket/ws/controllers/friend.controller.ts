import { wsSessionManager } from "../../ws/connection";
import { PacketType } from "../../shared/protocol";
import { Logger } from "@/core/logger";

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

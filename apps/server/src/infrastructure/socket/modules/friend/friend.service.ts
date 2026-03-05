import { Logger } from "@/infrastructure/logger";
import { getRedisClient } from "@/infrastructure/redis";
import { PacketType } from "@/infrastructure/socket/protocol/packet-type";

import { sendJsonToSessions } from "./friend.gateway";
import { friendRepository } from "./friend.repository";
import type {
	DevicePresencePayload,
	FriendAcceptedPayload,
	FriendIdPayload,
	FriendPresencePayload,
	FriendRequestPayload,
} from "./friend.types";

const FRIEND_IDS_CACHE_TTL_SECONDS = 5 * 60;
const FRIEND_IDS_CACHE_KEY_PREFIX = "friend:accepted:ids:";
const FRIEND_IDS_CACHE_META_KEY_PREFIX = "friend:accepted:meta:";

function getFriendIdsCacheKey(userId: string): string {
	return `${FRIEND_IDS_CACHE_KEY_PREFIX}${userId}`;
}

function getFriendIdsMetaKey(userId: string): string {
	return `${FRIEND_IDS_CACHE_META_KEY_PREFIX}${userId}`;
}

async function readCachedUserFriendIds(userId: string): Promise<string[] | undefined> {
	try {
		const redis = getRedisClient();
		const metaExists = await redis.exists(getFriendIdsMetaKey(userId));
		if (metaExists === 0) {
			return undefined;
		}

		return redis.sMembers(getFriendIdsCacheKey(userId));
	} catch (error) {
		Logger.warn("WebSocket", `Failed to read friend graph cache for user ${userId}`, error);
		return undefined;
	}
}

async function cacheUserFriendIds(userId: string, friendIds: string[]): Promise<void> {
	try {
		const redis = getRedisClient();
		const cacheKey = getFriendIdsCacheKey(userId);
		const metaKey = getFriendIdsMetaKey(userId);
		const tx = redis
			.multi()
			.del(cacheKey)
			.set(metaKey, "1", { EX: FRIEND_IDS_CACHE_TTL_SECONDS });

		if (friendIds.length > 0) {
			tx.sAdd(cacheKey, friendIds).expire(cacheKey, FRIEND_IDS_CACHE_TTL_SECONDS);
		}

		await tx.exec();
	} catch (error) {
		Logger.warn("WebSocket", `Failed to write friend graph cache for user ${userId}`, error);
	}
}

export async function invalidateUsersFriendGraphCache(userIds: string[]): Promise<void> {
	const normalizedUserIds = Array.from(
		new Set(
			userIds
				.map((id) => id?.trim())
				.filter((id): id is string => Boolean(id)),
		),
	);
	if (normalizedUserIds.length === 0) {
		return;
	}

	const keys = normalizedUserIds.flatMap((userId) => [getFriendIdsCacheKey(userId), getFriendIdsMetaKey(userId)]);

	try {
		await getRedisClient().del(keys);
	} catch (error) {
		Logger.warn("WebSocket", "Failed to invalidate friend graph cache", error);
	}
}

export async function getUserFriendIds(userId: string): Promise<string[]> {
	const cachedFriendIds = await readCachedUserFriendIds(userId);
	if (cachedFriendIds !== undefined) {
		return cachedFriendIds;
	}

	const links = await friendRepository.listAcceptedFriendLinks(userId);
	const friendIds = links.map((entry) => (entry.userLowId === userId ? entry.userHighId : entry.userLowId));
	await cacheUserFriendIds(userId, friendIds);
	return friendIds;
}

export function broadcastFriendRequestReceived(targetUserId: string, payload: FriendRequestPayload): void {
	const sent = sendJsonToSessions(targetUserId, PacketType.FRIEND_REQUEST_RECEIVED, JSON.stringify(payload));
	Logger.debug("WebSocket", `Broadcasted FRIEND_REQUEST_RECEIVED to ${sent} sessions for user ${targetUserId}`);
}

export function broadcastFriendRequestAccepted(targetUserId: string, payload: FriendAcceptedPayload): void {
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

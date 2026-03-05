import { Logger } from "@/infrastructure/logger";
import {
	broadcastFriendRequestAccepted,
	broadcastFriendRequestCancelled,
	broadcastFriendRequestReceived,
	broadcastFriendRequestRejected,
	broadcastFriendRemoved,
	invalidateUsersFriendGraphCache,
} from "@/infrastructure/socket/modules/friend";
import { sendJsonToSessions } from "@/infrastructure/socket/modules/friend/friend.gateway";
import { isUserOnline as isUserOnlineFromPresence } from "@/infrastructure/socket/presence";
import { PacketType } from "@/infrastructure/socket/protocol/packet-type";
import type { DevicesEventsPort } from "@/modules/devices";
import type { FriendsEventsPort } from "@/modules/friends";

type FriendPresenceLookup = {
	isUserOnline(userId: string): Promise<boolean>;
	invalidateFriendGraphCache(userIds: string[]): Promise<void>;
};

export function createWsDevicesEvents(): DevicesEventsPort {
	return {
		emitDeviceAdded(userId, dto) {
			try {
				const payload = JSON.stringify(dto);
				sendJsonToSessions(userId, PacketType.DEVICE_ADDED, payload);
			} catch (error) {
				Logger.error("WebSocket", "Failed to broadcast DEVICE_ADDED", error);
			}
		},
	};
}

const defaultPresenceLookup: FriendPresenceLookup = {
	isUserOnline: isUserOnlineFromPresence,
	invalidateFriendGraphCache: invalidateUsersFriendGraphCache,
};

export function createWsFriendsEvents(sessionLookup: FriendPresenceLookup = defaultPresenceLookup): FriendsEventsPort {
	return {
		async isUserOnline(userId) {
			return sessionLookup.isUserOnline(userId);
		},
		async invalidateFriendGraphCache(userIds) {
			try {
				await sessionLookup.invalidateFriendGraphCache(userIds);
			} catch (error) {
				Logger.warn("WebSocket", "Failed to invalidate friend graph cache", error);
			}
		},
		emitRequestReceived(targetUserId, payload) {
			broadcastFriendRequestReceived(targetUserId, payload);
		},
		emitRequestAccepted(targetUserId, payload) {
			broadcastFriendRequestAccepted(targetUserId, payload);
		},
		emitRequestRejected(targetUserId, payload) {
			broadcastFriendRequestRejected(targetUserId, payload);
		},
		emitRequestCancelled(targetUserId, payload) {
			broadcastFriendRequestCancelled(targetUserId, payload);
		},
		emitFriendRemoved(targetUserId, payload) {
			broadcastFriendRemoved(targetUserId, payload);
		},
	};
}

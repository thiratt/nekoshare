import { Logger } from "@/infrastructure/logger";
import {
	broadcastFriendRequestAccepted,
	broadcastFriendRequestCancelled,
	broadcastFriendRequestReceived,
	broadcastFriendRequestRejected,
	broadcastFriendRemoved,
} from "@/infrastructure/socket/modules/friend";
import { PacketType } from "@/infrastructure/socket/protocol/packet-type";
import { wsSessionManager } from "@/infrastructure/socket/transport/ws/connection";
import type { DevicesEventsPort } from "@/modules/devices";
import type { FriendsEventsPort } from "@/modules/friends";

type PacketWriterLike = {
	writeString(value: string): void;
};

type SessionLike = {
	id: string;
	sendPacket(packetType: PacketType, writePayload?: (writer: PacketWriterLike) => void): void;
};

type DeviceEventsSessionLookup = {
	getSessionsByUserId(userId: string): SessionLike[];
};

type FriendPresenceLookup = {
	isUserOnline(userId: string): boolean;
};

export function createWsDevicesEvents(sessionLookup: DeviceEventsSessionLookup = wsSessionManager): DevicesEventsPort {
	return {
		emitDeviceAdded(userId, dto) {
			try {
				const userSessions = sessionLookup.getSessionsByUserId(userId);
				if (userSessions.length === 0) {
					return;
				}

				const payload = JSON.stringify(dto);
				for (const session of userSessions) {
					session.sendPacket(PacketType.DEVICE_ADDED, (writer) => writer.writeString(payload));
				}
			} catch (error) {
				Logger.error("WebSocket", "Failed to broadcast DEVICE_ADDED", error);
			}
		},
	};
}

export function createWsFriendsEvents(sessionLookup: FriendPresenceLookup = wsSessionManager): FriendsEventsPort {
	return {
		isUserOnline(userId) {
			return sessionLookup.isUserOnline(userId);
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

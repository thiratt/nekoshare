import type { FriendItem, FriendStatus } from "@/types/api";

import type { FriendRecord, UserRecord } from "./friends.repository";

export function isFriendParticipant(record: FriendRecord, userId: string): boolean {
	return record.userLowId === userId || record.userHighId === userId;
}

export function getOtherUserId(record: FriendRecord, userId: string): string | null {
	if (record.userLowId === userId) {
		return record.userHighId;
	}
	if (record.userHighId === userId) {
		return record.userLowId;
	}
	return null;
}

export function getUserPair(userAId: string, userBId: string): { userLowId: string; userHighId: string } {
	return userAId < userBId
		? { userLowId: userAId, userHighId: userBId }
		: { userLowId: userBId, userHighId: userAId };
}

export function mapFriendStatus(record: FriendRecord, currentUserId: string): FriendStatus {
	if (record.status === "accepted") {
		return "friend";
	}
	if (record.status === "blocked") {
		return "blocked";
	}
	if (record.status === "pending") {
		return record.requestedByUserId === currentUserId ? "outgoing" : "incoming";
	}
	return "none";
}

export function mapFriendToItem(
	record: FriendRecord,
	currentUserId: string,
	friendUser: UserRecord | undefined,
	isOnline: boolean,
): FriendItem | null {
	const friendUserId = getOtherUserId(record, currentUserId);
	if (!friendUserId) {
		return null;
	}

	return {
		id: friendUserId,
		friendId: record.id,
		name: friendUser?.name ?? "Unknown",
		email: friendUser?.email ?? "",
		avatarUrl: friendUser?.image ?? undefined,
		status: mapFriendStatus(record, currentUserId),
		isOnline,
		lastActive: friendUser?.lastActiveAt?.toISOString() ?? new Date().toISOString(),
		createdAt: record.createdAt.toISOString(),
	};
}

export function mapSearchFriendStatus(record: FriendRecord | undefined, currentUserId: string): FriendStatus {
	if (!record) {
		return "none";
	}

	if (record.status === "accepted") {
		return "friend";
	}
	if (record.status === "blocked") {
		return "blocked";
	}
	if (record.status === "pending") {
		return record.requestedByUserId === currentUserId ? "outgoing" : "incoming";
	}

	return "none";
}

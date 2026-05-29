import type { FriendItem } from "@workspace/app-ui/types/friends";

import type { FriendsFilterResult } from "../types";

export function getInitials(name: string): string {
	const parts = name.trim().split(" ").filter(Boolean);
	return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

export function formatRelativeTime(dateString: string): string {
	try {
		const date = new Date(dateString);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMs / 3600000);
		const diffDays = Math.floor(diffMs / 86400000);

		if (diffMins < 1) return "เมื่อสักครู่";
		if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`;
		if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`;
		if (diffDays < 7) return `${diffDays} วันที่แล้ว`;
		return date.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
	} catch {
		return dateString;
	}
}

export function formatCreatedAt(createdAt: string): string {
	try {
		return `เพิ่มเมื่อ ${new Date(createdAt).toLocaleDateString("th-TH", {
			day: "numeric",
			month: "short",
		})}`;
	} catch {
		return "เพิ่มเมื่อไม่ทราบวันที่";
	}
}

export function filterFriendGroups(
	friends: FriendItem[],
	incoming: FriendItem[],
	outgoing: FriendItem[],
	query: string,
): FriendsFilterResult {
	const normalizedQuery = query.trim().toLowerCase();
	const matchesQuery = (friend: FriendItem) =>
		!normalizedQuery || `${friend.name} ${friend.email}`.toLowerCase().includes(normalizedQuery);

	return {
		filteredFriends: friends.filter(matchesQuery),
		filteredIncoming: incoming.filter(matchesQuery),
		filteredOutgoing: outgoing.filter(matchesQuery),
	};
}

import type { DragEvent } from "react";

import type { FriendItem as ApiFriendItem } from "@workspace/app-ui/types/friends";

import type { FriendFilter, FriendRelation, FriendsFilterResult, FriendViewItem } from "../types";

export function getInitials(name: string): string {
	const parts = name.trim().split(/\s+/).slice(0, 2);

	return (
		parts
			.map((part) => part.charAt(0))
			.join("")
			.toUpperCase() || "?"
	);
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
	friends: ApiFriendItem[],
	incoming: ApiFriendItem[],
	outgoing: ApiFriendItem[],
	query: string,
): FriendsFilterResult {
	const normalizedQuery = query.trim().toLowerCase();
	const matchesQuery = (friend: ApiFriendItem) =>
		!normalizedQuery || `${friend.name} ${friend.email}`.toLowerCase().includes(normalizedQuery);

	return {
		filteredFriends: friends.filter(matchesQuery),
		filteredIncoming: incoming.filter(matchesQuery),
		filteredOutgoing: outgoing.filter(matchesQuery),
	};
}

export function matchesFriendFilter(friend: FriendViewItem, filter: FriendFilter) {
	switch (filter) {
		case "all":
			return true;

		case "online":
			return friend.relation === "friend" && friend.online;

		case "offline":
			return friend.relation === "friend" && !friend.online;

		case "requests":
			return friend.relation !== "friend";
	}
}

export function canSendToFriend(friend: FriendViewItem) {
	return friend.relation === "friend" && friend.online;
}

export function canDropFiles(event: DragEvent, friend: FriendViewItem, dropEnabled: boolean) {
	return dropEnabled && canSendToFriend(friend) && event.dataTransfer.types.includes("Files");
}

export function getRelationLabel(relation: FriendRelation) {
	switch (relation) {
		case "friend":
			return "Friend";

		case "incoming-request":
			return "Incoming request";

		case "outgoing-request":
			return "Request pending";
	}
}

export function toFriendViewItem(friend: ApiFriendItem, relation: FriendRelation): FriendViewItem {
	return {
		id: friend.friendId,
		name: friend.name,
		// TODO(api): The current friend contract exposes email, not a username.
		// Use the real email value until a username field is added to the API.
		username: friend.email,
		relation,
		// TODO(runtime): Presence is optional in the current contract. Missing
		// presence is treated as offline until the realtime layer reports it.
		online: friend.isOnline === true,
		addedAt: formatFriendDate(friend.createdAt),
	};
}

export function formatFriendDate(value: Date | string) {
	const timestamp = value instanceof Date ? value.getTime() : Date.parse(value);
	if (Number.isNaN(timestamp)) return "Unknown";

	return new Intl.DateTimeFormat(undefined, {
		dateStyle: "medium",
	}).format(timestamp);
}

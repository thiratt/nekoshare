export type FriendStatus = "none" | "outgoing" | "incoming" | "friend" | "blocked";

export interface FriendItem {
	id: string;
	friendshipId: string;
	name: string;
	email: string;
	avatarUrl?: string;
	status: FriendStatus;
	sharedCount: number;
	lastActive: string;
	createdAt: string;
}

export interface FriendListResponse {
	friends: FriendItem[];
	incoming: FriendItem[];
	outgoing: FriendItem[];
	total: { friends: number; incoming: number; outgoing: number };
}

export interface UserSearchResult {
	id: string;
	name: string;
	email: string;
	avatarUrl?: string;
	friendStatus: FriendStatus;
}

export interface UserSearchResponse {
	users: UserSearchResult[];
	total: number;
}

export interface FriendActionResponse {
	success: boolean;
	friendshipId: string;
	status: FriendStatus;
}

// Legacy types for backward compatibility during migration
export type FriendProps = FriendItem;

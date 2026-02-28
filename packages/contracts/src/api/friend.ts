export type FriendStatus = "none" | "outgoing" | "incoming" | "friend" | "blocked";

export interface FriendItem {
	id: string;
	friendId: string;
	name: string;
	email: string;
	avatarUrl?: string;
	status: FriendStatus;
	lastActive: string;
	createdAt: string;
	isOnline: boolean;
}

export interface FriendListResponse {
	friends: FriendItem[];
	incoming: FriendItem[];
	outgoing: FriendItem[];
	total: { friends: number; incoming: number; outgoing: number };
}

export interface FriendRequestPayload {
	userId: string;
}

export interface FriendActionResponse {
	success: boolean;
	friendId: string;
	status: FriendStatus;
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

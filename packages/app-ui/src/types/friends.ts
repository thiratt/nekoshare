import type {
	FriendActionResponse as SharedFriendActionResponse,
	FriendItem as SharedFriendItem,
	FriendListResponse as SharedFriendListResponse,
	FriendStatus as SharedFriendStatus,
	UserSearchResponse as SharedUserSearchResponse,
	UserSearchResult as SharedUserSearchResult,
} from "@workspace/contracts/api";

export type FriendStatus = SharedFriendStatus;
export type FriendItem = Omit<SharedFriendItem, "isOnline"> & { isOnline?: boolean };
export type FriendListResponse = Omit<SharedFriendListResponse, "friends" | "incoming" | "outgoing"> & {
	friends: FriendItem[];
	incoming: FriendItem[];
	outgoing: FriendItem[];
};
export type UserSearchResult = SharedUserSearchResult;
export type UserSearchResponse = SharedUserSearchResponse;
export type FriendActionResponse = SharedFriendActionResponse;

// Legacy types for backward compatibility during migration
export type FriendProps = FriendItem;

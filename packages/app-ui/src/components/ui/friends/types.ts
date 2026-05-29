import type { FriendItem, UserSearchResult } from "@workspace/app-ui/types/friends";

export type FriendsDeleteConfirmation = {
	friend: FriendItem | null;
	open: boolean;
};

export type FriendsFilterResult = {
	filteredFriends: FriendItem[];
	filteredIncoming: FriendItem[];
	filteredOutgoing: FriendItem[];
};

export type FriendRowActionProps = {
	onAccept?: (friendId: string) => void;
	onReject?: (friendId: string) => void;
	onCancel?: (friendId: string) => void;
	onRemove?: (friendId: string) => void;
};

export type UserSearchStatusInfo = {
	label: string;
	color: string;
};

export type AvailableUserSearchStatus = Exclude<UserSearchResult["friendStatus"], "none">;

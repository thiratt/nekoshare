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

export type FriendFilter = "all" | "online" | "offline" | "requests";

export type FriendRelation = "friend" | "incoming-request" | "outgoing-request";

export type FriendViewItem = {
	id: string;
	name: string;
	username: string;
	relation: FriendRelation;
	online: boolean;
	addedAt: string;
};

export type FriendCollectionProps = {
	friends: FriendViewItem[];
	selectedId: string | null;
	dropTargetId: string | null;
	onSelect: (id: string) => void;
	onDropTargetChange: (id: string | null) => void;
	onFiles: (friend: FriendViewItem, files: File[]) => void;
	dropEnabled: boolean;
};

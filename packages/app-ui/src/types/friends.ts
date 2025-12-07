export type FriendStatus = "active" | "pending";

export interface FriendProps {
	id: string;
	name: string;
	email: string;
	avatarUrl?: string;
	status: FriendStatus;
	sharedCount: number;
	lastActive: string;
	invitedAt: string;
}

export interface RowActionsProps {
	onCopy: () => void;
	onRevoke: () => void;
}

export interface RevokeConfirmDialogProps {
	open: boolean;
	count: number;
	onConfirm: () => void;
	onCancel: () => void;
}

export interface FriendListResponse {
	friends: FriendProps[];
	total: number;
}

export interface FriendInviteResponse {
	friend: FriendProps;
	isNew: boolean;
}

export interface FriendRevokeResponse {
	deleted: string[];
	count: number;
}

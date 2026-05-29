import { memo } from "react";

import { LuUserPlus } from "react-icons/lu";

import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";

import type { UserSearchResult } from "@workspace/app-ui/types/friends";

import { USER_SEARCH_STATUS_LABELS } from "../constants";
import { getInitials } from "../utils/friend-utils";

type UserResultRowProps = {
	user: UserSearchResult;
	onSelect: (user: UserSearchResult) => void;
};

export const UserResultRow = memo(function UserResultRow({ onSelect, user }: UserResultRowProps) {
	const isAvailable = user.friendStatus === "none";
	const statusInfo = user.friendStatus !== "none" ? USER_SEARCH_STATUS_LABELS[user.friendStatus] : null;

	return (
		<button
			type="button"
			className={`group flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${
				isAvailable ? "cursor-pointer hover:bg-muted" : "cursor-not-allowed opacity-60"
			}`}
			onClick={() => isAvailable && onSelect(user)}
			disabled={!isAvailable}
		>
			<Avatar className="h-9 w-9 shrink-0">
				<AvatarImage src={user.avatarUrl} alt={user.name} />
				<AvatarFallback className="bg-muted text-xs font-medium text-muted-foreground">
					{getInitials(user.name)}
				</AvatarFallback>
			</Avatar>
			<div className="min-w-0 flex-1">
				<p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">{user.name}</p>
				<p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{user.email}</p>
			</div>
			{statusInfo ? (
				<span className={`shrink-0 text-xs font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
			) : null}
			{isAvailable ? (
				<span className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
					<LuUserPlus className="h-4 w-4 text-muted-foreground" />
				</span>
			) : null}
		</button>
	);
});

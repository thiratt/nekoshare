import { memo } from "react";

import { LuUserPlus, LuUserRound } from "react-icons/lu";

import { Button } from "@workspace/ui/components/button";

import { EmptyState } from "../../shared/EmptyState";

export function FriendEmptyState({
	hasFilter,
	onAddFriend,
	onReset,
}: {
	hasFilter: boolean;
	onAddFriend: () => void;
	onReset: () => void;
}) {
	if (hasFilter) {
		return (
			<EmptyState
				icon={<LuUserRound />}
				title="No matching friends"
				description="Try another search or reset the active filter."
				action={
					<Button variant="outline" onClick={onReset}>
						Clear filters
					</Button>
				}
			/>
		);
	}

	return (
		<EmptyState
			icon={<LuUserRound />}
			title="No friends yet"
			description="Add a friend to send files securely between accounts."
			action={
				<Button type="button" size="sm" onClick={onAddFriend}>
					<LuUserPlus />
					Add friend
				</Button>
			}
		/>
	);
}

export const SkeletonRow = memo(function SkeletonRow() {
	return (
		<div className="flex animate-pulse items-center gap-4 rounded-xl border bg-card px-4 py-3">
			<div className="size-10 rounded-full bg-muted" />
			<div className="min-w-0 flex-1 space-y-2">
				<div className="h-4 w-32 rounded bg-muted" />
				<div className="h-3 w-56 rounded bg-muted" />
			</div>
		</div>
	);
});

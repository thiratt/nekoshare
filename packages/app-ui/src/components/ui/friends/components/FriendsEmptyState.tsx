import { memo } from "react";

import { LuUserPlus, LuUserRound } from "react-icons/lu";

import { Button } from "@workspace/ui/components/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@workspace/ui/components/empty";

export function FriendsEmptyState({ hasFilter, onReset }: { hasFilter: boolean; onReset: () => void }) {
	return (
		<div className="flex h-full min-h-80 flex-col items-center justify-center p-8 text-center">
			<LuUserRound className="size-8 text-muted-foreground/50" />

			<p className="mt-3 text-sm font-medium">{hasFilter ? "No matching friends" : "No friends yet"}</p>

			<p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
				{hasFilter
					? "Try another search or reset the active filter."
					: "Add a friend to send files securely between accounts."}
			</p>

			{hasFilter && (
				<Button type="button" variant="outline" size="sm" className="mt-4" onClick={onReset}>
					Reset filters
				</Button>
			)}
		</div>
	);
}

type EmptyStateProps = {
	title?: string;
	description?: string;
	icon?: React.ReactNode;
	onAddFriend?: () => void;
};

export const EmptyState = memo(function EmptyState({
	description = "เริ่มต้นด้วยการเพิ่มเพื่อนคนแรกของคุณ",
	icon,
	onAddFriend,
	title = "ยังไม่มีเพื่อน",
}: EmptyStateProps) {
	return (
		<Empty className="h-full">
			<EmptyHeader>
				<EmptyMedia variant="icon">{icon ?? <LuUserPlus />}</EmptyMedia>
				<EmptyTitle>{title}</EmptyTitle>
				<EmptyDescription>{description}</EmptyDescription>
			</EmptyHeader>
			<EmptyContent>
				<Button type="button" size="sm" onClick={onAddFriend}>
					<LuUserPlus />
					เพิ่มเพื่อน
				</Button>
			</EmptyContent>
		</Empty>
	);
});

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

type NoResultsProps = {
	query: string;
};

export const NoResults = memo(function NoResults({ query }: NoResultsProps) {
	return <EmptyState title="ไม่พบเพื่อน" description={`ไม่พบผลลัพธ์สำหรับ "${query}"`} />;
});

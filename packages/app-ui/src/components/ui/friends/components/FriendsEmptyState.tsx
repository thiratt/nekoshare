import { memo } from "react";

import { LuUserPlus } from "react-icons/lu";

import { Button } from "@workspace/ui/components/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@workspace/ui/components/empty";

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

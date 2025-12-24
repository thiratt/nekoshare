import { memo } from "react";

import { LuArrowUpDown, LuCheck, LuChevronDown, LuChevronUp, LuX } from "react-icons/lu";
import type { Column } from "@tanstack/react-table";

import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@workspace/ui/components/tooltip";

import type { FriendProps, FriendStatus } from "@workspace/app-ui/types/friends";

import { getInitials,STATUS_CONFIG } from "./constants";

interface SortableHeaderProps {
	column: Column<FriendProps, unknown>;
	label: string;
}

interface FriendAvatarCellProps {
	friend: FriendProps;
}

interface ActionButtonProps {
	onClick: (e: React.MouseEvent) => void;
	icon: React.ReactNode;
	label: string;
	variant?: "accept" | "destructive";
}

interface FriendRowActionsProps {
	friend: FriendProps;
	onAccept: (id: string) => void;
	onDeny: (id: string) => void;
	onRemove: (id: string) => void;
}

export const SortableHeader = memo(function SortableHeader({ column, label }: SortableHeaderProps) {
	const sorted = column.getIsSorted();

	const SortIcon = sorted === "asc" ? LuChevronUp : sorted === "desc" ? LuChevronDown : LuArrowUpDown;

	return (
		<div
			className="inline-flex items-center gap-1 cursor-pointer select-none"
			onClick={() => column.toggleSorting(sorted === "asc")}
		>
			{label}
			<SortIcon className="w-4 h-4" />
		</div>
	);
});

export const StatusBadge = memo(function StatusBadge({ status }: { status: FriendStatus }) {
	const config = STATUS_CONFIG[status];
	return (
		<Badge variant={config.variant} className="capitalize">
			{config.label}
		</Badge>
	);
});

export const FriendAvatarCell = memo(function FriendAvatarCell({ friend }: FriendAvatarCellProps) {
	return (
		<div className="flex items-center gap-3">
			<Avatar className="h-9 w-9 ring-2 ring-background">
				<AvatarImage src={friend.avatarUrl || undefined} alt={friend.name} />
				<AvatarFallback className="text-xs font-medium">{getInitials(friend.name)}</AvatarFallback>
			</Avatar>
			<div className="min-w-0 flex-1">
				<div className="font-medium truncate">{friend.name}</div>
				<div className="text-xs text-muted-foreground truncate">{friend.email}</div>
			</div>
		</div>
	);
});

export const ActionButton = memo(function ActionButton({
	onClick,
	icon,
	label,
	variant = "destructive",
}: ActionButtonProps) {
	const className =
		variant === "accept"
			? "h-8 w-8 hover:bg-primary hover:text-primary-foreground dark:hover:bg-primary"
			: "h-8 w-8 hover:bg-destructive hover:text-primary-foreground dark:hover:bg-destructive/60 dark:hover:text-foreground";

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button variant="ghost" size="icon" className={className} onClick={onClick} aria-label={label}>
					{icon}
				</Button>
			</TooltipTrigger>
			<TooltipContent>{label}</TooltipContent>
		</Tooltip>
	);
});

export const FriendRowActions = memo(function FriendRowActions({
	friend,
	onAccept,
	onDeny,
	onRemove,
}: FriendRowActionsProps) {
	const handleClick = (handler: (id: string) => void) => (e: React.MouseEvent) => {
		e.stopPropagation();
		handler(friend.id);
	};

	if (friend.status === "pending") {
		return (
			<div className="flex gap-1">
				<ActionButton onClick={handleClick(onAccept)} icon={<LuCheck />} label="ยอมรับ" variant="accept" />
				<ActionButton onClick={handleClick(onDeny)} icon={<LuX />} label="ปฏิเสธ" />
			</div>
		);
	}

	if (friend.status === "active") {
		return (
			<div className="flex gap-1">
				<ActionButton onClick={handleClick(onRemove)} icon={<LuX />} label="ลบเพื่อน" />
			</div>
		);
	}

	return null;
});

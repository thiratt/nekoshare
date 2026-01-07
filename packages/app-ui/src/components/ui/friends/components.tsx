import { memo } from "react";

import { LuArrowUpDown, LuCheck, LuChevronDown, LuChevronUp, LuClock, LuUserMinus, LuX } from "react-icons/lu";
import type { Column } from "@tanstack/react-table";

import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@workspace/ui/components/tooltip";

import type { FriendItem, FriendStatus } from "@workspace/app-ui/types/friends";

import { getInitials, STATUS_CONFIG } from "./constants";

interface SortableHeaderProps {
	column: Column<FriendItem, unknown>;
	label: string;
}

interface FriendAvatarCellProps {
	friend: FriendItem;
}

interface ActionButtonProps {
	onClick: (e: React.MouseEvent) => void;
	icon: React.ReactNode;
	label: string;
	variant?: "accept" | "destructive" | "warning";
	disabled?: boolean;
}

interface FriendRowActionsProps {
	friend: FriendItem;
	onAccept?: (friendshipId: string) => void;
	onReject?: (friendshipId: string) => void;
	onCancel?: (friendshipId: string) => void;
	onRemove?: (friendshipId: string) => void;
	loading?: boolean;
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
	if (!config.label) return null;
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
	disabled = false,
}: ActionButtonProps) {
	const className =
		variant === "accept"
			? "h-8 w-8 hover:bg-primary hover:text-primary-foreground dark:hover:bg-primary"
			: variant === "warning"
				? "h-8 w-8 hover:bg-amber-500 hover:text-white dark:hover:bg-amber-600"
				: "h-8 w-8 hover:bg-destructive hover:text-primary-foreground dark:hover:bg-destructive/60 dark:hover:text-foreground";

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					className={className}
					onClick={onClick}
					aria-label={label}
					disabled={disabled}
				>
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
	onReject,
	onCancel,
	onRemove,
	loading = false,
}: FriendRowActionsProps) {
	const handleClick = (handler?: (id: string) => void) => (e: React.MouseEvent) => {
		e.stopPropagation();
		handler?.(friend.friendshipId);
	};

	if (friend.status === "incoming") {
		return (
			<div className="flex gap-1">
				<ActionButton
					onClick={handleClick(onAccept)}
					icon={<LuCheck />}
					label="ยอมรับ"
					variant="accept"
					disabled={loading}
				/>
				<ActionButton onClick={handleClick(onReject)} icon={<LuX />} label="ปฏิเสธ" disabled={loading} />
			</div>
		);
	}

	if (friend.status === "outgoing") {
		return (
			<div className="flex gap-1">
				<ActionButton
					onClick={handleClick(onCancel)}
					icon={<LuClock />}
					label="ยกเลิกคำขอ"
					variant="warning"
					disabled={loading}
				/>
			</div>
		);
	}

	if (friend.status === "friend") {
		return (
			<div className="flex gap-1">
				<ActionButton
					onClick={handleClick(onRemove)}
					icon={<LuUserMinus />}
					label="ลบเพื่อน"
					disabled={loading}
				/>
			</div>
		);
	}

	return null;
});

export const FriendRequestCard = memo(function FriendRequestCard({
	friend,
	onAccept,
	onReject,
	onCancel,
	loading = false,
}: FriendRowActionsProps) {
	const handleClick = (handler?: (id: string) => void) => (e: React.MouseEvent) => {
		e.stopPropagation();
		handler?.(friend.friendshipId);
	};

	return (
		<div className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
			<Avatar className="h-10 w-10 ring-2 ring-background">
				<AvatarImage src={friend.avatarUrl || undefined} alt={friend.name} />
				<AvatarFallback className="text-sm font-medium">{getInitials(friend.name)}</AvatarFallback>
			</Avatar>
			<div className="min-w-0 flex-1">
				<div className="font-medium truncate">{friend.name}</div>
				<div className="text-xs text-muted-foreground truncate">{friend.email}</div>
			</div>
			<div className="flex gap-1">
				{friend.status === "incoming" && (
					<>
						<Button size="sm" onClick={handleClick(onAccept)} disabled={loading} className="gap-1">
							<LuCheck className="w-4 h-4" />
							ยอมรับ
						</Button>
						<Button size="sm" variant="outline" onClick={handleClick(onReject)} disabled={loading}>
							<LuX className="w-4 h-4" />
						</Button>
					</>
				)}
				{friend.status === "outgoing" && (
					<Button
						size="sm"
						variant="outline"
						onClick={handleClick(onCancel)}
						disabled={loading}
						className="gap-1"
					>
						<LuX className="w-4 h-4" />
						ยกเลิก
					</Button>
				)}
			</div>
		</div>
	);
});

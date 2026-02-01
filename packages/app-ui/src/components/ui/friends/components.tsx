import { memo, useCallback } from "react";

import { LuChevronRight, LuEllipsis, LuUserMinus } from "react-icons/lu";

import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { cn } from "@workspace/ui/lib/utils";

import type { FriendItem } from "@workspace/app-ui/types/friends";

const getInitials = (name: string): string => {
	const parts = name.trim().split(" ").filter(Boolean);
	return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
};

const formatRelativeTime = (dateString: string): string => {
	try {
		const date = new Date(dateString);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMs / 3600000);
		const diffDays = Math.floor(diffMs / 86400000);

		if (diffMins < 1) return "เมื่อสักครู่";
		if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`;
		if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`;
		if (diffDays < 7) return `${diffDays} วันที่แล้ว`;
		return date.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
	} catch {
		return dateString;
	}
};

interface StatusIndicatorProps {
	isOnline?: boolean;
	size?: "sm" | "md";
}

export const StatusIndicator = memo(function StatusIndicator({ isOnline, size = "sm" }: StatusIndicatorProps) {
	const sizeClass = size === "sm" ? "w-2.5 h-2.5" : "w-3 h-3";

	return (
		<span
			className={cn(
				sizeClass,
				"rounded-full border-2 border-background absolute bottom-0 right-0",
				isOnline ? "bg-emerald-500" : "bg-neutral-300 dark:bg-neutral-600",
			)}
			aria-label={isOnline ? "Online" : "Offline"}
		/>
	);
});

interface FriendRowProps {
	friend: FriendItem;
	onAccept?: (friendId: string) => void;
	onReject?: (friendId: string) => void;
	onCancel?: (friendId: string) => void;
	onRemove?: (friendId: string) => void;
	loading?: boolean;
}

export const FriendRow = memo(function FriendRow({
	friend,
	onAccept,
	onReject,
	onCancel,
	onRemove,
	loading = false,
}: FriendRowProps) {
	const handleAccept = useCallback(() => onAccept?.(friend.friendId), [onAccept, friend.friendId]);
	const handleReject = useCallback(() => onReject?.(friend.friendId), [onReject, friend.friendId]);
	const handleCancel = useCallback(() => onCancel?.(friend.friendId), [onCancel, friend.friendId]);
	const handleRemove = useCallback(() => onRemove?.(friend.friendId), [onRemove, friend.friendId]);

	return (
		<div className="group flex items-center gap-3 px-6 py-3 hover:bg-muted/60 transition-colors duration-150 has-[button:hover]:bg-transparent">
			<div className="relative shrink-0">
				<Avatar className="h-10 w-10">
					<AvatarImage src={friend.avatarUrl} alt={friend.name} />
					<AvatarFallback className="bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 text-sm font-medium">
						{getInitials(friend.name)}
					</AvatarFallback>
				</Avatar>
				{friend.status === "friend" && <StatusIndicator isOnline={friend.isOnline} />}
			</div>

			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2">
					<span className="font-medium text-sm text-neutral-900 dark:text-neutral-100 truncate">
						{friend.name}
					</span>
					{friend.status === "incoming" && (
						<span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
							คำขอใหม่
						</span>
					)}
					{friend.status === "outgoing" && (
						<span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
							รอตอบรับ
						</span>
					)}
				</div>
				<p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{friend.email}</p>
			</div>

			{friend.status === "friend" && (
				<div className="hidden sm:flex flex-col items-end text-right">
					<span className="text-[11px] text-neutral-400 dark:text-neutral-500">
						{friend.isOnline ? "ออนไลน์" : formatRelativeTime(friend.lastActive)}
					</span>
				</div>
			)}

			<div className="flex items-center gap-1">
				{friend.status === "incoming" && (
					<div className="flex items-center gap-2">
						<Button className="group-items" size="sm" onClick={handleAccept} disabled={loading}>
							ยอมรับ
						</Button>
						<Button size="sm" variant="outline" onClick={handleReject} disabled={loading}>
							ปฏิเสธ
						</Button>
					</div>
				)}

				{friend.status === "outgoing" && (
					<Button size="sm" variant="outline" onClick={handleCancel} disabled={loading}>
						ยกเลิก
					</Button>
				)}

				{friend.status === "friend" && (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								size="sm"
								variant="ghost"
								className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
								disabled={loading}
							>
								<LuEllipsis className="w-4 h-4" />
								<span className="sr-only">เมนู</span>
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-48">
							<DropdownMenuItem className="text-sm">
								<LuChevronRight className="w-4 h-4 mr-2" />
								ดูโปรไฟล์
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								className="text-sm text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/20"
								onClick={handleRemove}
							>
								<LuUserMinus className="w-4 h-4 mr-2" />
								ลบเพื่อน
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				)}
			</div>
		</div>
	);
});

interface SectionHeaderProps {
	title: string;
	count: number;
	className?: string;
}

export const SectionHeader = memo(function SectionHeader({ title, count, className }: SectionHeaderProps) {
	return (
		<div className={cn("flex items-center justify-between px-6 py-2 border-b", "sticky top-0 z-10", className)}>
			<h3 className="text-sm">{title}</h3>
			<span className="text-sm tabular-nums">{count}</span>
		</div>
	);
});

interface EmptyStateProps {
	title?: string;
	description?: string;
	icon?: React.ReactNode;
}

export const EmptyState = memo(function EmptyState({
	title = "ยังไม่มีเพื่อน",
	description = "เริ่มต้นด้วยการเพิ่มเพื่อนคนแรกของคุณ",
	icon,
}: EmptyStateProps) {
	return (
		<div className="flex flex-col items-center justify-center py-16 px-4 text-center">
			{icon && <div className="mb-4 text-neutral-300 dark:text-neutral-600">{icon}</div>}
			<p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">{title}</p>
			<p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1 max-w-[200px]">{description}</p>
		</div>
	);
});

export const SkeletonRow = memo(function SkeletonRow() {
	return (
		<div className="flex items-center gap-3 px-4 py-3 animate-pulse">
			<div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-700" />
			<div className="flex-1 space-y-2">
				<div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-32" />
				<div className="h-3 bg-neutral-100 dark:bg-neutral-800 rounded w-48" />
			</div>
		</div>
	);
});

interface NoResultsProps {
	query: string;
}

export const NoResults = memo(function NoResults({ query }: NoResultsProps) {
	return (
		<div className="flex flex-col items-center justify-center py-12 px-4 text-center">
			<p className="text-sm text-neutral-500 dark:text-neutral-400">ไม่พบผลลัพธ์สำหรับ &ldquo;{query}&rdquo;</p>
		</div>
	);
});

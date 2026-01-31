import { memo } from "react";

import { LuCheck, LuCircle, LuClock, LuPencil, LuShare2, LuTrash2, LuUsers, LuX } from "react-icons/lu";

import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";

import type { FriendItem, FriendStatus } from "@workspace/app-ui/types/friends";

import { formatDate, getInitials, STATUS_CONFIG } from "./constants";

interface FriendCardProps {
	friend: FriendItem;
	onAccept?: (friendId: string) => void;
	onReject?: (friendId: string) => void;
	onCancel?: (friendId: string) => void;
	onRemove?: (friendId: string) => void;
	loading?: boolean;
}

interface StatusBadgeProps {
	status: FriendStatus;
	isOnline?: boolean;
}

interface FriendSectionProps {
	title: string;
	count: number;
	icon: React.ReactNode;
	children: React.ReactNode;
	variant?: "default" | "online" | "offline" | "request";
}

export const StatusBadge = memo(function StatusBadge({ status, isOnline }: StatusBadgeProps) {
	if (status === "friend") {
		return (
			<Badge
				variant="secondary"
				className={cn(
					"[&>svg]:size-1.5",
					isOnline
						? "bg-green-100 text-green-800 border border-green-300 dark:bg-green-200"
						: "bg-gray-100 text-gray-600 border border-gray-300 dark:bg-gray-200",
				)}
			>
				<LuCircle className={cn("size-1.5 fill-current", isOnline ? "text-green-600" : "text-gray-400")} />
				{isOnline ? "ออนไลน์" : "ออฟไลน์"}
			</Badge>
		);
	}

	const config = STATUS_CONFIG[status];
	if (!config.label) return null;

	const className =
		status === "incoming"
			? "bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-200"
			: status === "outgoing"
				? "bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-200"
				: "";

	return (
		<Badge variant={config.variant} className={className}>
			{config.label}
		</Badge>
	);
});

export const FriendSection = memo(function FriendSection({
	title,
	count,
	icon,
	children,
	variant = "default",
}: FriendSectionProps) {
	const headerClassName = cn(
		"flex items-center gap-2 mb-3 pb-2 border-b",
		variant === "online" && "border-green-200",
		variant === "offline" && "border-gray-200",
		variant === "request" && "border-blue-200",
	);

	const iconClassName = cn(
		"w-5 h-5",
		variant === "online" && "text-green-600",
		variant === "offline" && "text-gray-400",
		variant === "request" && "text-blue-600",
		variant === "default" && "text-muted-foreground",
	);

	return (
		<div className="mb-6">
			<div className={headerClassName}>
				<span className={iconClassName}>{icon}</span>
				<h3 className="font-semibold text-sm">{title}</h3>
				<Badge>{count}</Badge>
			</div>
			<div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-2">{children}</div>
		</div>
	);
});

export const FriendCard = memo(function FriendCard({
	friend,
	onAccept,
	onReject,
	onCancel,
	onRemove,
	loading = false,
}: FriendCardProps) {
	return (
		<Card className="dark:border-accent">
			<CardHeader className="flex justify-between">
				<div className="flex items-center gap-3">
					<div className="relative">
						<Avatar className="h-12 w-12 ring-2 ring-background">
							<AvatarImage src={friend.avatarUrl || undefined} alt={friend.name} />
							<AvatarFallback className="text-sm font-medium">{getInitials(friend.name)}</AvatarFallback>
						</Avatar>
						{friend.status === "friend" && (
							<span
								className={cn(
									"absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background",
									friend.isOnline ? "bg-green-500" : "bg-gray-400",
								)}
							/>
						)}
					</div>
					<div className="space-y-1">
						<CardTitle className="text-base">{friend.name}</CardTitle>
						<p className="text-sm text-muted-foreground">{friend.email}</p>
						<StatusBadge status={friend.status} isOnline={friend.isOnline} />
					</div>
				</div>
				{friend.status === "friend" && (
					<div className="flex items-center gap-1 text-muted-foreground">
						<LuShare2 className="w-4 h-4" />
						<span className="text-sm tabular-nums">{friend.sharedCount}</span>
					</div>
				)}
			</CardHeader>
			{friend.status === "friend" && (
				<CardContent>
					<div className="space-y-1 text-sm text-muted-foreground">
						<div className="flex justify-between">
							<span>ใช้งานล่าสุด</span>
							<span>{formatDate(friend.lastActive)}</span>
						</div>
						<div className="flex justify-between">
							<span>เพิ่มเมื่อ</span>
							<span>{formatDate(friend.createdAt)}</span>
						</div>
					</div>
				</CardContent>
			)}
			<CardFooter>
				<div className="pt-2 border-t flex gap-2 w-full">
					{friend.status === "incoming" && (
						<>
							<Button
								className="flex-1"
								size="sm"
								onClick={() => onAccept?.(friend.friendId)}
								disabled={loading}
							>
								<LuCheck />
								ยอมรับ
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={() => onReject?.(friend.friendId)}
								disabled={loading}
							>
								<LuX />
								ปฏิเสธ
							</Button>
						</>
					)}
					{friend.status === "outgoing" && (
						<Button
							className="flex-1"
							variant="outline"
							size="sm"
							onClick={() => onCancel?.(friend.friendId)}
							disabled={loading}
						>
							<LuClock />
							ยกเลิกคำขอ
						</Button>
					)}
					{friend.status === "friend" && (
						<div className="flex items-center gap-1 w-full">
							<Button className="flex-1" size="sm" variant="outline" disabled={loading}>
								รายละเอียด
							</Button>
							<Button size="sm" variant="outline" disabled={loading}>
								<LuPencil />
							</Button>
							<Button
								variant="destructive"
								size="sm"
								onClick={() => onRemove?.(friend.friendId)}
								disabled={loading}
							>
								<LuTrash2 />
							</Button>
						</div>
					)}
				</div>
			</CardFooter>
		</Card>
	);
});

export const EmptyState = memo(function EmptyState({ searchQuery }: { searchQuery?: string }) {
	return (
		<div className="h-[calc(100vh-14rem)] flex flex-col items-center justify-center border-2 border-dashed rounded-lg text-muted-foreground space-y-4">
			<LuUsers className="w-8 h-8 mb-2" />
			{searchQuery ? (
				<p>ไม่พบเพื่อนที่ตรงกับ &quot;{searchQuery}&quot;</p>
			) : (
				<>
					<p>ยังไม่มีเพื่อน</p>
					<p className="text-xs text-center max-w-xs">เริ่มต้นด้วยการเพิ่มเพื่อนคนแรกของคุณ</p>
				</>
			)}
		</div>
	);
});

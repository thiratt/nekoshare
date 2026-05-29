import { memo, useCallback } from "react";

import { LuEllipsis, LuUserMinus } from "react-icons/lu";

import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";

import type { FriendItem } from "@workspace/app-ui/types/friends";

import { formatCreatedAt, formatRelativeTime, getInitials } from "../utils/friend-utils";
import { FriendStatusPill } from "./FriendStatusPill";
import { StatusIndicator } from "./StatusIndicator";
import type { FriendRowActionProps } from "../types";

type FriendRowProps = FriendRowActionProps & {
	friend: FriendItem;
	loading?: boolean;
};

export const FriendRow = memo(function FriendRow({
	friend,
	loading = false,
	onAccept,
	onCancel,
	onReject,
	onRemove,
}: FriendRowProps) {
	const isFriend = friend.status === "friend";
	const isIncoming = friend.status === "incoming";
	const isOutgoing = friend.status === "outgoing";
	const online = Boolean(friend.isOnline);

	const handleAccept = useCallback(() => onAccept?.(friend.friendId), [friend.friendId, onAccept]);
	const handleReject = useCallback(() => onReject?.(friend.friendId), [friend.friendId, onReject]);
	const handleCancel = useCallback(() => onCancel?.(friend.friendId), [friend.friendId, onCancel]);
	const handleRemove = useCallback(() => onRemove?.(friend.friendId), [friend.friendId, onRemove]);

	return (
		<div className="flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3">
			<div className="relative shrink-0">
				<Avatar className="size-10">
					<AvatarImage src={friend.avatarUrl} alt={friend.name} />
					<AvatarFallback className="bg-primary text-sm font-medium text-primary-foreground">
						{getInitials(friend.name)}
					</AvatarFallback>
				</Avatar>

				{isFriend ? <StatusIndicator isOnline={online} /> : null}
			</div>

			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-2">
					<span className="truncate font-medium text-foreground">{friend.name}</span>
					<FriendStatusPill friend={friend} />
				</div>

				<div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
					<span className="truncate">{friend.email}</span>
					<span>{formatCreatedAt(friend.createdAt)}</span>
				</div>

				<p className="mt-1 text-xs text-muted-foreground/70">
					{isFriend
						? online
							? "พร้อมแชร์ไฟล์"
							: `ล่าสุด ${formatRelativeTime(friend.lastActive)}`
						: isIncoming
							? "รอให้คุณตอบรับคำขอ"
							: "รออีกฝ่ายตอบรับคำขอ"}
				</p>
			</div>

			<div className="flex items-center gap-1">
				{isIncoming ? (
					<>
						<Button type="button" size="sm" className="rounded-full" onClick={handleAccept} disabled={loading}>
							ยอมรับ
						</Button>
						<Button
							type="button"
							size="sm"
							variant="outline"
							className="rounded-full"
							onClick={handleReject}
							disabled={loading}
						>
							ปฏิเสธ
						</Button>
					</>
				) : null}

				{isOutgoing ? (
					<Button
						type="button"
						size="sm"
						variant="outline"
						className="rounded-full"
						onClick={handleCancel}
						disabled={loading}
					>
						ยกเลิก
					</Button>
				) : null}

				{isFriend ? (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button type="button" size="sm" variant="ghost" className="size-8 rounded-full" disabled={loading}>
								<LuEllipsis />
								<span className="sr-only">เมนูเพื่อน</span>
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-44">
							<DropdownMenuItem disabled>ดูโปรไฟล์</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem variant="destructive" onSelect={handleRemove}>
								<LuUserMinus />
								ลบเพื่อน
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				) : null}
			</div>
		</div>
	);
});

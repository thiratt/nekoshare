import type { FriendItem } from "@workspace/app-ui/types/friends";

export function FriendStatusPill({ friend }: { friend: FriendItem }) {
	if (friend.status === "incoming") {
		return (
			<span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-600 dark:text-blue-400">
				คำขอใหม่
			</span>
		);
	}

	if (friend.status === "outgoing") {
		return (
			<span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
				รอตอบรับ
			</span>
		);
	}

	return <span className="text-xs text-muted-foreground">{friend.isOnline ? "ออนไลน์" : "ออฟไลน์"}</span>;
}

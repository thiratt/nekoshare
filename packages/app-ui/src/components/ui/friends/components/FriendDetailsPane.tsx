import { LuCheck, LuSend, LuUserMinus, LuX } from "react-icons/lu";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";

import { AnimatePresence, motion } from "@workspace/app-ui/components/provide-animate";

import { canSendToFriend, getInitials, getRelationLabel } from "../utils/friend-utils";
import type { FriendViewItem } from "../types";

export function FriendDetailsPane({
	friend,
	onClose,
	onSendFiles,
	onAccept,
	onDecline,
	onCancelRequest,
	onRemove,
}: {
	friend: FriendViewItem;
	onClose: () => void;
	onSendFiles: () => void;
	onAccept: () => void;
	onDecline: () => void;
	onCancelRequest: () => void;
	onRemove: () => void;
}) {
	return (
		<div className="flex h-full flex-col bg-muted/10">
			<div className="flex h-11 shrink-0 items-center justify-between border-b px-3">
				<span className="text-sm font-medium">Friend details</span>

				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="size-7"
					aria-label="Close details"
					onClick={onClose}
				>
					<LuX className="size-3.5" />
				</Button>
			</div>

			<AnimatePresence mode="wait" initial={false}>
				<motion.div
					key={friend.id}
					initial={{ opacity: 0, x: 8 }}
					animate={{ opacity: 1, x: 0 }}
					exit={{ opacity: 0, x: -8 }}
					transition={{
						duration: 0.14,
						ease: [0.22, 1, 0.36, 1],
					}}
					className="min-h-0 flex-1 overflow-y-auto p-4"
				>
					<div className="flex flex-col items-center text-center">
						<div
							className={cn(
								"relative grid shrink-0 place-items-center border bg-background font-semibold shadow-xs",
								"size-16 rounded-2xl text-lg",
							)}
						>
							{getInitials(friend.name)}

							<span
								className={cn(
									"absolute rounded-full border-2 border-background",
									"size-3.5 -bottom-0.5 -right-0.5",
									friend.online ? "bg-emerald-500" : "bg-muted-foreground/40",
								)}
							/>
						</div>

						<h2 className="mt-4 text-sm font-semibold">{friend.name}</h2>

						<p className="mt-1 text-xs text-muted-foreground">{friend.username}</p>

						<div className="mt-2">
							<FriendStatus friend={friend} />
						</div>
					</div>

					{friend.relation === "friend" && (
						<Button
							type="button"
							className="mt-5 w-full gap-2"
							disabled={!canSendToFriend(friend)}
							onClick={onSendFiles}
						>
							<LuSend className="size-4" />

							{friend.online ? "Send files" : "Friend is offline"}
						</Button>
					)}

					{friend.relation === "incoming-request" && (
						<div className="mt-5 grid grid-cols-2 gap-2">
							<Button type="button" className="gap-2" onClick={onAccept}>
								<LuCheck className="size-4" />
								Accept
							</Button>

							<Button type="button" variant="outline" onClick={onDecline}>
								Decline
							</Button>
						</div>
					)}

					{friend.relation === "outgoing-request" && (
						<Button type="button" variant="outline" className="mt-5 w-full" onClick={onCancelRequest}>
							Cancel request
						</Button>
					)}

					<dl className="mt-5 space-y-3 border-t pt-4 text-xs">
						<DetailRow label="Status" value={getRelationLabel(friend.relation)} />

						<DetailRow
							label={friend.relation === "friend" ? "Friends since" : "Requested"}
							value={friend.addedAt}
						/>
					</dl>

					{friend.relation === "friend" && (
						<div className="mt-4 space-y-1 border-t pt-3">
							<Button
								type="button"
								variant="ghost"
								className="h-9 w-full justify-start gap-2 text-destructive hover:text-destructive"
								onClick={onRemove}
							>
								<LuUserMinus className="size-4" />
								Remove friend
							</Button>
						</div>
					)}
				</motion.div>
			</AnimatePresence>
		</div>
	);
}

function FriendStatus({ friend }: { friend: FriendViewItem }) {
	if (friend.relation === "incoming-request") {
		return <Badge>Incoming request</Badge>;
	}

	if (friend.relation === "outgoing-request") {
		return <Badge variant="secondary">Pending</Badge>;
	}

	return friend.online ? <Badge variant="secondary">Online</Badge> : <Badge variant="destructive">Offline</Badge>;
}

function DetailRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-start justify-between gap-4">
			<dt className="shrink-0 text-muted-foreground">{label}</dt>

			<dd className="min-w-0 truncate text-right font-medium" title={value}>
				{value}
			</dd>
		</div>
	);
}

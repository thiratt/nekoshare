import { Badge } from "@workspace/ui/components/badge";
import { cn } from "@workspace/ui/lib/utils";

import { canDropFiles, getInitials } from "../utils/friend-utils";
import type { FriendCollectionProps, FriendViewItem } from "../types";

export function FriendListView({
	friends,
	selectedId,
	dropTargetId,
	onSelect,
	onDropTargetChange,
	onFiles,
	dropEnabled,
}: FriendCollectionProps) {
	return (
		<div className="min-w-[850px]">
			<div
				className={cn(
					"sticky top-0 z-10 grid h-8",
					"grid-cols-[minmax(260px,1fr)_170px_130px]",
					"items-center border-b bg-background/95 px-3",
					"text-[11px] text-muted-foreground backdrop-blur",
				)}
			>
				<span>Name</span>
				<span>Status</span>
				<span>Added</span>
			</div>

			<div className="p-1.5">
				{friends.map((friend) => {
					const selected = selectedId === friend.id;
					const isDropTarget = dropTargetId === friend.id;

					return (
						<button
							key={friend.id}
							type="button"
							aria-selected={selected}
							className={cn(
								"grid min-h-12 w-full",
								"grid-cols-[minmax(260px,1fr)_170px_130px]",
								"items-center rounded-md px-2 text-left outline-none",
								"transition-[background-color,box-shadow] duration-150",
								"hover:bg-accent/60",
								"focus-visible:ring-2 focus-visible:ring-ring",
								selected && "bg-accent text-accent-foreground",
								isDropTarget && "bg-primary/10 ring-2 ring-inset ring-primary/40",
							)}
							onClick={() => onSelect(friend.id)}
							onDragEnter={(event) => {
								if (!canDropFiles(event, friend, dropEnabled)) return;
								event.preventDefault();
								onDropTargetChange(friend.id);
							}}
							onDragOver={(event) => {
								if (!canDropFiles(event, friend, dropEnabled)) return;
								event.preventDefault();
								event.dataTransfer.dropEffect = "copy";
							}}
							onDragLeave={(event) => {
								if (
									event.relatedTarget instanceof Node &&
									event.currentTarget.contains(event.relatedTarget)
								) {
									return;
								}
								onDropTargetChange(null);
							}}
							onDrop={(event) => {
								event.preventDefault();
								event.stopPropagation();
								onDropTargetChange(null);
								if (!canDropFiles(event, friend, dropEnabled)) return;
								onFiles(friend, Array.from(event.dataTransfer.files));
							}}
						>
							<FriendName friend={friend} />

							<FriendStatus friend={friend} />

							<span className="truncate text-xs text-muted-foreground">{friend.addedAt}</span>
						</button>
					);
				})}
			</div>
		</div>
	);
}

function FriendName({ friend }: { friend: FriendViewItem }) {
	return (
		<div className="flex min-w-0 items-center gap-2.5">
			<FriendAvatar friend={friend} size="small" />

			<div className="min-w-0">
				<div className="flex min-w-0 items-center gap-1.5">
					<p className="truncate text-xs font-medium">{friend.name}</p>
				</div>

				<p className="mt-0.5 truncate text-[11px] text-muted-foreground">{friend.username}</p>
			</div>
		</div>
	);
}

function FriendAvatar({ friend, size }: { friend: FriendViewItem; size: "small" | "detail" }) {
	const sizeClass = {
		small: "size-8 rounded-md text-[11px]",
		detail: "size-16 rounded-2xl text-lg",
	}[size];

	const indicatorSize = {
		small: "size-2.5 -bottom-0.5 -right-0.5",
		detail: "size-3.5 -bottom-0.5 -right-0.5",
	}[size];

	return (
		<div
			className={cn(
				"relative grid shrink-0 place-items-center border bg-background font-semibold shadow-xs",
				sizeClass,
			)}
		>
			{getInitials(friend.name)}

			<span
				className={cn(
					"absolute rounded-full border-2 border-background",
					friend.online ? "bg-emerald-500" : "bg-muted-foreground/40",
					indicatorSize,
				)}
			/>
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

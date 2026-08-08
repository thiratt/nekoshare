import { useEffect, useMemo, useState } from "react";

import { LuPlus } from "react-icons/lu";

import { Button } from "@workspace/ui/components/button";
import { ButtonGroup } from "@workspace/ui/components/button-group";
import { Dialog } from "@workspace/ui/components/dialog";
import { SearchInput } from "@workspace/ui/components/search-input";
import { cn } from "@workspace/ui/lib/utils";

import { AnimatePresence, motion } from "@workspace/app-ui/components/provide-animate";

import { AddFriendDialog } from "../dialogs/AddFriendDialog";
import { RevokeConfirmDialog } from "../dialogs/RevokeConfirmDialog";
import { useFriendsController } from "../hooks/useFriendsController";
import { canSendToFriend, matchesFriendFilter, toFriendViewItem } from "../utils/friend-utils";
import { FriendDetailsPane } from "./FriendDetailsPane";
import { FriendListView } from "./FriendListView";
import { FriendsEmptyState } from "./FriendsEmptyState";
import type { FriendFilter } from "../types";

const filters: Array<{
	value: FriendFilter;
	label: string;
}> = [
	{ value: "all", label: "All" },
	{ value: "online", label: "Online" },
	{ value: "offline", label: "Offline" },
	{ value: "requests", label: "Requests" },
];

export interface FriendsUIProps {
	onDropFiles?: (friendId: string, files: File[]) => void;
	onSendFiles?: (friendId: string) => void;
}

export function FriendsUI({ onDropFiles, onSendFiles }: FriendsUIProps = {}) {
	const controller = useFriendsController();
	const friends = useMemo(
		() => [
			...controller.friends.map((friend) => toFriendViewItem(friend, "friend")),
			...controller.incoming.map((friend) => toFriendViewItem(friend, "incoming-request")),
			...controller.outgoing.map((friend) => toFriendViewItem(friend, "outgoing-request")),
		],
		[controller.friends, controller.incoming, controller.outgoing],
	);

	const [filter, setFilter] = useState<FriendFilter>("all");
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [dropTargetId, setDropTargetId] = useState<string | null>(null);

	const visibleFriends = useMemo(() => {
		const query = searchQuery.trim().toLowerCase();

		return friends.filter((friend) => {
			const matches = matchesFriendFilter(friend, filter);
			const matchesSearch =
				query.length === 0 ||
				friend.name.toLowerCase().includes(query) ||
				friend.username.toLowerCase().includes(query);

			return matches && matchesSearch;
		});
	}, [filter, friends, searchQuery]);

	const selectedFriend = friends.find((friend) => friend.id === selectedId) ?? null;

	const requestCount = friends.filter((friend) => friend.relation === "incoming-request").length;

	useEffect(() => {
		if (selectedId && !visibleFriends.some((friend) => friend.id === selectedId)) {
			setSelectedId(null);
		}
	}, [selectedId, visibleFriends]);

	function openShareComposer(friend: (typeof friends)[number]) {
		if (!canSendToFriend(friend)) return;
		onSendFiles?.(friend.id);
	}

	function startTransfer(friend: (typeof friends)[number], files: File[]) {
		if (!canSendToFriend(friend) || files.length === 0 || !onDropFiles) return;
		onDropFiles(friend.id, files);
	}

	function handleAccept(friend: (typeof friends)[number]) {
		if (friend.relation === "incoming-request") {
			controller.handleAccept(friend.id);
		}
	}

	function handleDecline(friend: (typeof friends)[number]) {
		if (friend.relation === "incoming-request") {
			controller.handleReject(friend.id);
		}
	}

	function handleCancelRequest(friend: (typeof friends)[number]) {
		if (friend.relation === "outgoing-request") {
			controller.handleCancel(friend.id);
		}
	}

	return (
		<div className="flex min-h-0 flex-1 flex-col bg-background">
			<header className="shrink-0 border-b">
				<div className="flex flex-wrap items-center gap-2 p-2">
					<ButtonGroup>
						{filters.map((item) => (
							<Button
								key={item.value}
								type="button"
								size="sm"
								variant={filter === item.value ? "secondary" : "outline"}
								className={cn("h-8", filter === item.value && "border")}
								aria-pressed={filter === item.value}
								onClick={() => setFilter(item.value)}
							>
								{item.label}

								{item.value === "requests" && requestCount > 0 && (
									<span className="ml-0.5 mt-0.5 text-xs tabular-nums text-muted-foreground">
										{requestCount}
									</span>
								)}
							</Button>
						))}
					</ButtonGroup>

					<div className="flex-1" />

					<SearchInput
						searchQuery={searchQuery}
						onSearchQuery={setSearchQuery}
						onClearSearch={() => setSearchQuery("")}
						placeholder="Search friends..."
						className="w-full shadow-none sm:w-72"
					/>

					<Button type="button" size="sm" className="h-8 shrink-0 gap-1.5" onClick={controller.openAddDialog}>
						<LuPlus />
						Add friend
					</Button>
				</div>
			</header>

			{controller.error ? (
				<div className="border-b border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
					{controller.error}
				</div>
			) : null}

			<div className="flex min-h-0 flex-1">
				<main className="min-w-0 flex-1 overflow-auto">
					{controller.loading && friends.length === 0 ? (
						<div className="flex h-full items-center justify-center text-xs text-muted-foreground">
							Loading friends...
						</div>
					) : visibleFriends.length === 0 ? (
						<FriendsEmptyState
							hasFilter={filter !== "all" || searchQuery.trim().length > 0}
							onReset={() => {
								setFilter("all");
								setSearchQuery("");
							}}
						/>
					) : (
						<FriendListView
							friends={visibleFriends}
							selectedId={selectedId}
							dropTargetId={dropTargetId}
							onSelect={setSelectedId}
							onDropTargetChange={setDropTargetId}
							onFiles={startTransfer}
							dropEnabled={Boolean(onDropFiles)}
						/>
					)}
				</main>

				<AnimatePresence initial={false}>
					{selectedFriend && (
						<motion.aside
							key="friend-details"
							initial={{ width: 0, opacity: 0 }}
							animate={{ width: 320, opacity: 1 }}
							exit={{ width: 0, opacity: 0 }}
							transition={{
								width: {
									duration: 0.22,
									ease: [0.22, 1, 0.36, 1],
								},
								opacity: {
									duration: 0.14,
								},
							}}
							className="shrink-0 overflow-hidden border-l"
						>
							<div className="h-full w-80">
								<FriendDetailsPane
									friend={selectedFriend}
									onClose={() => setSelectedId(null)}
									onSendFiles={() => openShareComposer(selectedFriend)}
									onAccept={() => handleAccept(selectedFriend)}
									onDecline={() => handleDecline(selectedFriend)}
									onCancelRequest={() => handleCancelRequest(selectedFriend)}
									onRemove={() => controller.handleRemove(selectedFriend.id)}
								/>
							</div>
						</motion.aside>
					)}
				</AnimatePresence>
			</div>

			<footer className="flex h-8 shrink-0 items-center border-t bg-muted/15 px-3 text-xs text-muted-foreground">
				{visibleFriends.length} friends |{" "}
				{visibleFriends.filter((friend) => friend.relation === "friend" && friend.online).length} online
			</footer>

			<Dialog open={controller.isAddDialogOpen} onOpenChange={controller.setIsAddDialogOpen}>
				<AddFriendDialog onSubmit={controller.handleSendRequest} />
			</Dialog>

			<RevokeConfirmDialog
				open={controller.deleteConfirmation.open}
				count={controller.deleteConfirmation.friend ? 1 : 0}
				onConfirm={() => void controller.handleConfirmDelete()}
				onCancel={controller.handleCancelDelete}
			/>
		</div>
	);
}

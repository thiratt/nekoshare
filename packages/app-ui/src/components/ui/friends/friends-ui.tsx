import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";

import { LuPlus, LuRefreshCcw, LuUsers } from "react-icons/lu";

import { Button } from "@workspace/ui/components/button";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Dialog, DialogTrigger } from "@workspace/ui/components/dialog";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { SearchInput } from "@workspace/ui/components/search-input";
import { useToast } from "@workspace/ui/hooks/use-toast";
import { cn } from "@workspace/ui/lib/utils";

import { useFriends } from "@workspace/app-ui/hooks/use-friends";
import type { FriendItem } from "@workspace/app-ui/types/friends";

import { CardTransition } from "../../ext/card-transition";
import { EmptyState, FriendRow, NoResults, SectionHeader, SkeletonRow } from "./components";
import { AddFriendDialog, RevokeConfirmDialog } from "./dialogs";

export function FriendsUI() {
	const { toast } = useToast();
	const {
		friends,
		incoming,
		outgoing,
		loading,
		error,
		sendRequest,
		acceptRequest,
		rejectRequest,
		cancelRequest,
		removeFriend,
	} = useFriends();

	const [query, setQuery] = useState("");
	const deferredQuery = useDeferredValue(query);
	const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
	const [actionLoading, setActionLoading] = useState<string | null>(null);
	const [deleteConfirmation, setDeleteConfirmation] = useState<{
		open: boolean;
		friend: FriendItem | null;
	}>({ open: false, friend: null });

	const prevIncomingCountRef = useRef(incoming.length);
	const isInitializedRef = useRef(false);

	const { onlineFriends, offlineFriends, filteredRequests } = useMemo(() => {
		const normalizedQuery = deferredQuery.trim().toLowerCase();
		const matchesQuery = (item: FriendItem) =>
			!normalizedQuery || `${item.name} ${item.email}`.toLowerCase().includes(normalizedQuery);

		const online: FriendItem[] = [];
		const offline: FriendItem[] = [];
		const requests: FriendItem[] = [];

		for (const friend of friends) {
			if (!matchesQuery(friend)) continue;
			if (friend.isOnline) {
				online.push(friend);
			} else {
				offline.push(friend);
			}
		}

		for (const item of incoming) {
			if (matchesQuery(item)) requests.push(item);
		}
		for (const item of outgoing) {
			if (matchesQuery(item)) requests.push(item);
		}

		return { onlineFriends: online, offlineFriends: offline, filteredRequests: requests };
	}, [friends, incoming, outgoing, deferredQuery]);

	const totalCount = friends.length + incoming.length + outgoing.length;
	const hasItems = onlineFriends.length > 0 || offlineFriends.length > 0 || filteredRequests.length > 0;
	const showNoResults = !hasItems && deferredQuery.length > 0;
	const isEmpty = totalCount === 0 && !loading;

	useEffect(() => {
		if (!isInitializedRef.current) {
			prevIncomingCountRef.current = incoming.length;
			isInitializedRef.current = true;
			return;
		}

		if (incoming.length > prevIncomingCountRef.current) {
			const newest = incoming[0];
			if (newest) {
				toast.info(`คำขอเป็นเพื่อนจาก ${newest.name}`);
			}
		}

		prevIncomingCountRef.current = incoming.length;
	}, [incoming, toast]);

	const handleSendRequest = useCallback(
		async (userId: string) => {
			await sendRequest(userId);
			setIsAddDialogOpen(false);
		},
		[sendRequest],
	);

	const handleAccept = useCallback(
		async (friendId: string) => {
			setActionLoading(friendId);
			try {
				await acceptRequest(friendId);
			} finally {
				setActionLoading(null);
			}
		},
		[acceptRequest],
	);

	const handleReject = useCallback(
		async (friendId: string) => {
			setActionLoading(friendId);
			try {
				await rejectRequest(friendId);
			} finally {
				setActionLoading(null);
			}
		},
		[rejectRequest],
	);

	const handleCancel = useCallback(
		async (friendId: string) => {
			setActionLoading(friendId);
			try {
				await cancelRequest(friendId);
			} finally {
				setActionLoading(null);
			}
		},
		[cancelRequest],
	);

	const handleRemove = useCallback(
		(friendId: string) => {
			const allItems = [...friends, ...incoming, ...outgoing];
			const friend = allItems.find((f) => f.friendId === friendId);
			if (friend) {
				setDeleteConfirmation({ open: true, friend });
			}
		},
		[friends, incoming, outgoing],
	);

	const handleConfirmDelete = useCallback(async () => {
		if (deleteConfirmation.friend) {
			await removeFriend(deleteConfirmation.friend.friendId);
			setDeleteConfirmation({ open: false, friend: null });
		}
	}, [deleteConfirmation.friend, removeFriend]);

	return (
		<CardTransition className="h-full gap-4 overflow-hidden" tag="friends-card">
			<CardHeader>
				<div className="space-y-1">
					<CardTitle>เพื่อน</CardTitle>
					<CardDescription>คนที่สามารถแชร์ไฟล์กับคุณได้</CardDescription>
				</div>
				<div className="flex">
					<div className="flex items-center gap-2">
						<Button variant="outline" disabled={loading}>
							<LuRefreshCcw className={cn(loading && "animate-spin")} />
						</Button>
						<SearchInput
							placeholder="ค้นหา..."
							searchQuery={query}
							onSearchQuery={setQuery}
							onClearSearch={() => setQuery("")}
							className="w-64"
						/>
					</div>
					<Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
						<DialogTrigger asChild>
							<Button size="sm" className="h-9 gap-1.5 ml-auto">
								<LuPlus className="w-4 h-4" />
								<span className="hidden sm:inline">เพิ่มเพื่อน</span>
							</Button>
						</DialogTrigger>
						<AddFriendDialog onSubmit={handleSendRequest} />
					</Dialog>
				</div>
			</CardHeader>

			<CardContent className="px-0">
				{error && (
					<div className="px-6 py-3 bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-900/30">
						<p className="text-sm text-red-600 dark:text-red-400">{error}</p>
					</div>
				)}
				<ScrollArea className="flex-1">
					{loading && totalCount === 0 ? (
						<div className="divide-y divide-neutral-100 dark:divide-neutral-800">
							{Array.from({ length: 5 }).map((_, i) => (
								<SkeletonRow key={i} />
							))}
						</div>
					) : isEmpty ? (
						<EmptyState
							icon={<LuUsers className="w-12 h-12" />}
							title="ยังไม่มีเพื่อน"
							description="เพิ่มเพื่อนเพื่อเริ่มแชร์ไฟล์ได้อย่างง่ายดาย"
						/>
					) : showNoResults ? (
						<NoResults query={deferredQuery} />
					) : (
						<div className="pb-6">
							{filteredRequests.length > 0 && (
								<section>
									<SectionHeader title="คำขอเป็นเพื่อน" count={filteredRequests.length} />
									{filteredRequests.map((item) => (
										<FriendRow
											key={item.friendId}
											friend={item}
											onAccept={handleAccept}
											onReject={handleReject}
											onCancel={handleCancel}
											loading={actionLoading === item.friendId}
										/>
									))}
								</section>
							)}

							{onlineFriends.length > 0 && (
								<section>
									<SectionHeader title="ออนไลน์" count={onlineFriends.length} />
									{onlineFriends.map((friend) => (
										<FriendRow
											key={friend.friendId}
											friend={friend}
											onRemove={handleRemove}
											loading={actionLoading === friend.friendId}
										/>
									))}
								</section>
							)}

							{offlineFriends.length > 0 && (
								<section>
									<SectionHeader title="ออฟไลน์" count={offlineFriends.length} />
									{offlineFriends.map((friend) => (
										<FriendRow
											key={friend.friendId}
											friend={friend}
											onRemove={handleRemove}
											loading={actionLoading === friend.friendId}
										/>
									))}
								</section>
							)}
						</div>
					)}
				</ScrollArea>
			</CardContent>

			<RevokeConfirmDialog
				open={deleteConfirmation.open}
				count={1}
				onConfirm={handleConfirmDelete}
				onCancel={() => setDeleteConfirmation({ open: false, friend: null })}
			/>
		</CardTransition>
	);
}

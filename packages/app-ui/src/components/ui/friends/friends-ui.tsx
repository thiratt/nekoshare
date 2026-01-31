import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";

import { LuCircle, LuInbox, LuRefreshCcw, LuUserPlus } from "react-icons/lu";

import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardFooter, CardHeader } from "@workspace/ui/components/card";
import { CardDescription, CardTitle } from "@workspace/ui/components/card";
import { Dialog, DialogTrigger } from "@workspace/ui/components/dialog";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { SearchInput } from "@workspace/ui/components/search-input";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { useToast } from "@workspace/ui/hooks/use-toast";
import { cn } from "@workspace/ui/lib/utils";

import { CardTransition } from "@workspace/app-ui/components/ext/card-transition";
import { useFriends } from "@workspace/app-ui/hooks/use-friends";
import type { FriendItem } from "@workspace/app-ui/types/friends";

import { EmptyState, FriendCard, FriendSection } from "./components";
import { AddFriendDialog, RevokeConfirmDialog } from "./dialogs";

const isUserOnline = (lastActive: string): boolean => {
	const lastActiveDate = new Date(lastActive);
	const now = new Date();
	const diffMs = now.getTime() - lastActiveDate.getTime();
	const fiveMinutesMs = 5 * 60 * 1000;
	return diffMs < fiveMinutesMs;
};

export function FriendsUI() {
	const { toast } = useToast();
	const {
		friends,
		incoming,
		outgoing,
		loading,
		error,
		refresh,
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
	const [deleteConfirmation, setDeleteConfirmation] = useState<{ open: boolean; friend: FriendItem | null }>({
		open: false,
		friend: null,
	});

	const prevIncomingCountRef = useRef(incoming.length);
	const prevOutgoingCountRef = useRef(outgoing.length);
	const isInitializedRef = useRef(false);

	const friendsWithOnlineStatus = useMemo(() => {
		return friends.map((friend) => ({
			...friend,
			isOnline: friend.isOnline ?? isUserOnline(friend.lastActive),
		}));
	}, [friends]);

	const { onlineFriends, offlineFriends } = useMemo(() => {
		const online: FriendItem[] = [];
		const offline: FriendItem[] = [];

		friendsWithOnlineStatus.forEach((friend) => {
			if (friend.isOnline) {
				online.push(friend);
			} else {
				offline.push(friend);
			}
		});

		return { onlineFriends: online, offlineFriends: offline };
	}, [friendsWithOnlineStatus]);

	const requests = useMemo(() => {
		return [...incoming, ...outgoing];
	}, [incoming, outgoing]);

	const filterItems = useCallback(
		(items: FriendItem[]) => {
			const normalizedQuery = deferredQuery.trim().toLowerCase();
			if (!normalizedQuery) return items;
			return items.filter((item) => `${item.name} ${item.email}`.toLowerCase().includes(normalizedQuery));
		},
		[deferredQuery],
	);

	const filteredOnline = useMemo(() => filterItems(onlineFriends), [filterItems, onlineFriends]);
	const filteredOffline = useMemo(() => filterItems(offlineFriends), [filterItems, offlineFriends]);
	const filteredRequests = useMemo(() => filterItems(requests), [filterItems, requests]);

	const hasItems = filteredOnline.length > 0 || filteredOffline.length > 0 || filteredRequests.length > 0;
	const showNoResults = !hasItems && deferredQuery;
	const isEmpty = !hasItems && !deferredQuery && !loading;

	useEffect(() => {
		if (!isInitializedRef.current) {
			prevIncomingCountRef.current = incoming.length;
			prevOutgoingCountRef.current = outgoing.length;
			isInitializedRef.current = true;
			return;
		}

		if (incoming.length > prevIncomingCountRef.current) {
			const newCount = incoming.length - prevIncomingCountRef.current;
			const newestRequest = incoming[0];
			if (newestRequest) {
				toast.info(`คำขอเป็นเพื่อนใหม่จาก ${newestRequest.name}`, {
					description: newCount > 1 ? `และอีก ${newCount - 1} คำขอ` : undefined,
				});
			}
		}

		if (outgoing.length < prevOutgoingCountRef.current && friends.length > 0) {
			const acceptedFriend = friends.find((f) => !outgoing.some((o) => o.friendId === f.friendId));
			if (acceptedFriend) {
				toast.success(`${acceptedFriend.name} ยอมรับคำขอเป็นเพื่อนของคุณแล้ว`);
			}
		}

		prevIncomingCountRef.current = incoming.length;
		prevOutgoingCountRef.current = outgoing.length;
	}, [incoming, outgoing, friends, toast]);

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
			const allItems = [...requests, ...friendsWithOnlineStatus];
			const friend = allItems.find((f) => f.friendId === friendId);
			if (friend) {
				setDeleteConfirmation({ open: true, friend });
			}
		},
		[requests, friendsWithOnlineStatus],
	);

	const handleConfirmDelete = useCallback(async () => {
		if (deleteConfirmation.friend) {
			await removeFriend(deleteConfirmation.friend.friendId);
			setDeleteConfirmation({ open: false, friend: null });
		}
	}, [deleteConfirmation.friend, removeFriend]);

	const handleRefresh = useCallback(async () => {
		await refresh();
	}, [refresh]);

	return (
		<CardTransition className="h-full gap-4 overflow-hidden" tag="friends-card">
			<CardHeader>
				<div className="space-y-1">
					<CardTitle>เพื่อน</CardTitle>
					<CardDescription>คนที่สามารถแชร์ข้อมูลกับคุณได้</CardDescription>
				</div>
				<div className="flex">
					<div className="flex items-center gap-2">
						<Button variant="outline" onClick={handleRefresh} disabled={loading}>
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
					<div className="flex items-center ms-auto">
						<Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
							<DialogTrigger asChild>
								<Button className="gap-2">
									<LuUserPlus className="w-4 h-4" />
									เพิ่มเพื่อน
								</Button>
							</DialogTrigger>
							<AddFriendDialog onSubmit={handleSendRequest} />
						</Dialog>
					</div>
				</div>
			</CardHeader>

			<CardContent className="pt-0">
				{error && <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">{error}</div>}

				{loading && !hasItems && !showNoResults ? (
					<ScrollArea className="h-[calc(100vh-14rem)]">
						<div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-2">
							{[...Array(6)].map((_, i) => (
								<Card key={i} className="dark:border-accent">
									<CardHeader className="flex flex-row justify-between space-y-0 pb-2">
										<div className="flex items-center gap-3">
											<Skeleton className="size-12 rounded-full" />
											<div className="space-y-2">
												<Skeleton className="h-4 w-32" />
												<Skeleton className="h-3 w-40" />
												<Skeleton className="h-5 w-16" />
											</div>
										</div>
									</CardHeader>
									<CardContent className="space-y-2">
										<div className="flex justify-between items-center">
											<Skeleton className="h-4 w-24" />
											<Skeleton className="h-4 w-32" />
										</div>
										<div className="flex justify-between items-center">
											<Skeleton className="h-4 w-20" />
											<Skeleton className="h-4 w-32" />
										</div>
									</CardContent>
									<CardFooter>
										<Skeleton className="h-9 w-full" />
									</CardFooter>
								</Card>
							))}
						</div>
					</ScrollArea>
				) : isEmpty ? (
					<EmptyState />
				) : showNoResults ? (
					<div
						className={cn(
							"h-[calc(100vh-14rem)] flex flex-col items-center justify-center",
							"border-2 border-dashed rounded-lg text-muted-foreground space-y-2",
						)}
					>
						<p>ไม่พบเพื่อนที่ตรงกับ &quot;{deferredQuery}&quot;</p>
					</div>
				) : (
					<ScrollArea className="h-[calc(100vh-14rem)]">
						{filteredRequests.length > 0 && (
							<FriendSection
								title="คำขอเป็นเพื่อน"
								count={filteredRequests.length}
								icon={<LuInbox />}
								variant="request"
							>
								{filteredRequests.map((item) => (
									<FriendCard
										key={item.friendId}
										friend={item}
										onAccept={handleAccept}
										onReject={handleReject}
										onCancel={handleCancel}
										loading={actionLoading === item.friendId}
									/>
								))}
							</FriendSection>
						)}

						{filteredOnline.length > 0 && (
							<FriendSection
								title="ออนไลน์"
								count={filteredOnline.length}
								icon={<LuCircle className="fill-current text-green-500" />}
								variant="online"
							>
								{filteredOnline.map((item) => (
									<FriendCard
										key={item.friendId}
										friend={item}
										onRemove={handleRemove}
										loading={actionLoading === item.friendId}
									/>
								))}
							</FriendSection>
						)}

						{filteredOffline.length > 0 && (
							<FriendSection
								title="ออฟไลน์"
								count={filteredOffline.length}
								icon={<LuCircle className="text-gray-400" />}
								variant="offline"
							>
								{filteredOffline.map((item) => (
									<FriendCard
										key={item.friendId}
										friend={item}
										onRemove={handleRemove}
										loading={actionLoading === item.friendId}
									/>
								))}
							</FriendSection>
						)}
					</ScrollArea>
				)}
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

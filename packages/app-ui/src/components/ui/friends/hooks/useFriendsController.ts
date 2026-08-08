import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";

import { useToast } from "@workspace/ui/hooks/use-toast";

import { useFriends } from "@workspace/app-ui/hooks/use-friends";
import type { FriendItem } from "@workspace/app-ui/types/friends";

import { filterFriendGroups } from "../utils/friend-utils";
import type { FriendsDeleteConfirmation } from "../types";

export function useFriendsController() {
	const { toast } = useToast();
	const {
		acceptRequest,
		cancelRequest,
		error,
		friends,
		incoming,
		loading,
		outgoing,
		refresh,
		rejectRequest,
		removeFriend,
		sendRequest,
	} = useFriends();

	const [query, setQuery] = useState("");
	const deferredQuery = useDeferredValue(query);
	const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
	const [actionLoading, setActionLoading] = useState<string | null>(null);
	const [deleteConfirmation, setDeleteConfirmation] = useState<FriendsDeleteConfirmation>({
		friend: null,
		open: false,
	});

	const prevIncomingCountRef = useRef(incoming.length);
	const isInitializedRef = useRef(false);

	useEffect(() => {
		if (!isInitializedRef.current) {
			prevIncomingCountRef.current = incoming.length;
			isInitializedRef.current = true;
			return;
		}

		if (incoming.length > prevIncomingCountRef.current) {
			const newest = incoming[0];
			if (newest) {
				toast.info(`à¸„à¸³à¸‚à¸­à¹€à¸›à¹‡à¸™à¹€à¸žà¸·à¹ˆà¸­à¸™à¸ˆà¸²à¸ ${newest.name}`);
			}
		}

		prevIncomingCountRef.current = incoming.length;
	}, [incoming, toast]);

	const { filteredFriends, filteredIncoming, filteredOutgoing } = useMemo(
		() => filterFriendGroups(friends, incoming, outgoing, deferredQuery),
		[deferredQuery, friends, incoming, outgoing],
	);

	const totalCount = friends.length + incoming.length + outgoing.length;
	const visibleCount = filteredIncoming.length + filteredOutgoing.length + filteredFriends.length;
	const showNoResults = visibleCount === 0 && deferredQuery.trim().length > 0;
	const isEmpty = totalCount === 0 && !loading;

	const runFriendAction = useCallback(
		async (friendId: string, action: (friendId: string) => Promise<void>) => {
			setActionLoading(friendId);
			try {
				await action(friendId);
			} catch (actionError) {
				const message =
					actionError instanceof Error
						? actionError.message
						: "à¹„à¸¡à¹ˆà¸ªà¸²à¸¡à¸²à¸£à¸–à¸—à¸³à¸£à¸²à¸¢à¸à¸²à¸£à¹„à¸”à¹‰";
				toast.error(message);
			} finally {
				setActionLoading(null);
			}
		},
		[toast],
	);

	const handleSendRequest = useCallback(
		async (userId: string) => {
			await sendRequest(userId);
			setIsAddDialogOpen(false);
			toast.success("à¸ªà¹ˆà¸‡à¸„à¸³à¸‚à¸­à¹€à¸›à¹‡à¸™à¹€à¸žà¸·à¹ˆà¸­à¸™à¹à¸¥à¹‰à¸§");
		},
		[sendRequest, toast],
	);

	const handleAccept = useCallback(
		(friendId: string) => {
			void runFriendAction(friendId, acceptRequest);
		},
		[acceptRequest, runFriendAction],
	);

	const handleReject = useCallback(
		(friendId: string) => {
			void runFriendAction(friendId, rejectRequest);
		},
		[rejectRequest, runFriendAction],
	);

	const handleCancel = useCallback(
		(friendId: string) => {
			void runFriendAction(friendId, cancelRequest);
		},
		[cancelRequest, runFriendAction],
	);

	const handleRemove = useCallback(
		(friendId: string) => {
			const friend = friends.find((item: FriendItem) => item.friendId === friendId);
			if (!friend) return;

			setDeleteConfirmation({ friend, open: true });
		},
		[friends],
	);

	const handleConfirmDelete = useCallback(async () => {
		const friend = deleteConfirmation.friend;
		if (!friend) return;

		await runFriendAction(friend.friendId, removeFriend);
		setDeleteConfirmation({ friend: null, open: false });
	}, [deleteConfirmation.friend, removeFriend, runFriendAction]);

	const handleCancelDelete = useCallback(() => {
		setDeleteConfirmation({ friend: null, open: false });
	}, []);

	const handleRefresh = useCallback(() => {
		void refresh();
	}, [refresh]);

	const handleClearSearch = useCallback(() => {
		setQuery("");
	}, []);

	const openAddDialog = useCallback(() => {
		setIsAddDialogOpen(true);
	}, []);

	return {
		actionLoading,
		deleteConfirmation,
		deferredQuery,
		error,
		filteredFriends,
		// Expose raw API groups for presentation layers that implement their own
		// filtering while preserving the existing filtered fields for current callers.
		friends,
		incoming,
		outgoing,
		filteredIncoming,
		filteredOutgoing,
		handleAccept,
		handleCancel,
		handleCancelDelete,
		handleClearSearch,
		handleConfirmDelete,
		handleRefresh,
		handleReject,
		handleRemove,
		handleSendRequest,
		isAddDialogOpen,
		isEmpty,
		loading,
		openAddDialog,
		query,
		setIsAddDialogOpen,
		setQuery,
		showNoResults,
		totalCount,
	};
}

export type FriendsController = ReturnType<typeof useFriendsController>;

import { useCallback, useEffect, useMemo, useState } from "react";

import { AppError, ErrorCategory, ErrorSource } from "@workspace/app-ui/lib/errors";
import { PacketType } from "@workspace/app-ui/lib/nk-socket/protocol";
import { xfetchApi } from "@workspace/app-ui/lib/xfetch";
import type { FriendItem, FriendListResponse, UserSearchResult } from "@workspace/app-ui/types/friends";

import {
	FriendPresencePayload,
	FriendRemovedPayload,
	FriendRequestAcceptedPayload,
	FriendRequestCancelledPayload,
	FriendRequestReceivedPayload,
	FriendRequestRejectedPayload,
} from "../lib/nk-socket/payload";
import { usePacketRouter } from "./usePacketRouter";

const FRIENDS_API_ENDPOINTS = {
	LIST: "/friends",
	REQUEST: "/friends/request",
	ACCEPT: (id: string) => `/friends/${id}/accept`,
	REJECT: (id: string) => `/friends/${id}/reject`,
	CANCEL: (id: string) => `/friends/${id}/cancel`,
	REMOVE: (id: string) => `/friends/${id}`,
	SEARCH: (query: string) => `/friends/search?q=${encodeURIComponent(query)}`,
} as const;

const SEARCH_DEBOUNCE_MS = 300;

const sortByName = (a: FriendItem, b: FriendItem): number => a.name.localeCompare(b.name);

export interface UseFriendsState {
	readonly friends: FriendItem[];
	readonly incoming: FriendItem[];
	readonly outgoing: FriendItem[];
	readonly loading: boolean;
	readonly error: string | null;
}

export interface UseFriendsActions {
	readonly refresh: () => Promise<void>;
	readonly sendRequest: (userId: string) => Promise<void>;
	readonly acceptRequest: (friendId: string) => Promise<void>;
	readonly rejectRequest: (friendId: string) => Promise<void>;
	readonly cancelRequest: (friendId: string) => Promise<void>;
	readonly removeFriend: (friendId: string) => Promise<void>;
}

export type UseFriendsReturn = UseFriendsState & UseFriendsActions;

export interface UseUserSearchReturn {
	readonly query: string;
	readonly setQuery: (query: string) => void;
	readonly results: UserSearchResult[];
	readonly loading: boolean;
	readonly error: string | null;
	readonly clearSearch: () => void;
}

export function useFriends(): UseFriendsReturn {
	const [state, setState] = useState<UseFriendsState>({
		friends: [],
		incoming: [],
		outgoing: [],
		loading: true,
		error: null,
	});

	const socketHandlers = useMemo(
		() => ({
			[PacketType.FRIEND_REQUEST_RECEIVED]: (result: {
				status: string;
				data?: FriendRequestReceivedPayload;
				error?: { message: string };
			}) => {
				if (result.status === "success" && result.data) {
					const payload = result.data;
					const newIncoming: FriendItem = {
						id: payload.user.id,
						friendId: payload.friendId,
						name: payload.user.name,
						email: payload.user.email,
						avatarUrl: payload.user.avatarUrl,
						status: "incoming",
						sharedCount: 0,
						lastActive: new Date().toISOString(),
						createdAt: payload.createdAt,
					};
					setState((prev) => {
						if (prev.incoming.some((item) => item.friendId === payload.friendId)) {
							return prev;
						}
						return {
							...prev,
							incoming: [newIncoming, ...prev.incoming].sort(sortByName),
						};
					});
				} else {
					console.error("[useFriends] Failed to parse FRIEND_REQUEST_RECEIVED:", result.error?.message);
				}
			},

			[PacketType.FRIEND_REQUEST_ACCEPTED]: (result: {
				status: string;
				data?: FriendRequestAcceptedPayload;
				error?: { message: string };
			}) => {
				if (result.status === "success" && result.data) {
					const payload = result.data;
					setState((prev) => {
						const outgoingItem = prev.outgoing.find((item) => item.friendId === payload.friendId);
						if (!outgoingItem) {
							const newFriend: FriendItem = {
								id: payload.user.id,
								friendId: payload.friendId,
								name: payload.user.name,
								email: payload.user.email,
								avatarUrl: payload.user.avatarUrl,
								status: "friend",
								sharedCount: 0,
								lastActive: new Date().toISOString(),
								createdAt: new Date().toISOString(),
							};
							return {
								...prev,
								friends: [newFriend, ...prev.friends].sort(sortByName),
							};
						}
						return {
							...prev,
							outgoing: prev.outgoing.filter((item) => item.friendId !== payload.friendId),
							friends: [{ ...outgoingItem, status: "friend" as const }, ...prev.friends].sort(sortByName),
						};
					});
				} else {
					console.error("[useFriends] Failed to parse FRIEND_REQUEST_ACCEPTED:", result.error?.message);
				}
			},

			[PacketType.FRIEND_REQUEST_REJECTED]: (result: {
				status: string;
				data?: FriendRequestRejectedPayload;
				error?: { message: string };
			}) => {
				if (result.status === "success" && result.data) {
					const payload = result.data;
					setState((prev) => ({
						...prev,
						outgoing: prev.outgoing.filter((item) => item.friendId !== payload.friendId),
					}));
				} else {
					console.error("[useFriends] Failed to parse FRIEND_REQUEST_REJECTED:", result.error?.message);
				}
			},

			[PacketType.FRIEND_REQUEST_CANCELLED]: (result: {
				status: string;
				data?: FriendRequestCancelledPayload;
				error?: { message: string };
			}) => {
				if (result.status === "success" && result.data) {
					const payload = result.data;
					setState((prev) => ({
						...prev,
						incoming: prev.incoming.filter((item) => item.friendId !== payload.friendId),
					}));
				} else {
					console.error("[useFriends] Failed to parse FRIEND_REQUEST_CANCELLED:", result.error?.message);
				}
			},

			[PacketType.FRIEND_REMOVED]: (result: {
				status: string;
				data?: FriendRemovedPayload;
				error?: { message: string };
			}) => {
				if (result.status === "success" && result.data) {
					const payload = result.data;
					setState((prev) => ({
						...prev,
						friends: prev.friends.filter((item) => item.friendId !== payload.friendId),
						incoming: prev.incoming.filter((item) => item.friendId !== payload.friendId),
						outgoing: prev.outgoing.filter((item) => item.friendId !== payload.friendId),
					}));
				} else {
					console.error("[useFriends] Failed to parse FRIEND_REMOVED:", result.error?.message);
				}
			},

			[PacketType.FRIEND_ONLINE]: (result: {
				status: string;
				data?: FriendPresencePayload;
				error?: { message: string };
			}) => {
				if (result.status === "success" && result.data) {
					const { userId } = result.data;
					setState((prev) => ({
						...prev,
						friends: prev.friends.map((friend) =>
							friend.id === userId ? { ...friend, isOnline: true } : friend,
						),
					}));
				} else {
					console.error("[useFriends] Failed to parse FRIEND_ONLINE:", result.error?.message);
				}
			},

			[PacketType.FRIEND_OFFLINE]: (result: {
				status: string;
				data?: FriendPresencePayload;
				error?: { message: string };
			}) => {
				if (result.status === "success" && result.data) {
					const { userId } = result.data;
					setState((prev) => ({
						...prev,
						friends: prev.friends.map((friend) =>
							friend.id === userId ? { ...friend, isOnline: false } : friend,
						),
					}));
				} else {
					console.error("[useFriends] Failed to parse FRIEND_OFFLINE:", result.error?.message);
				}
			},
		}),
		[],
	);

	usePacketRouter(socketHandlers);

	const fetchFriends = useCallback(async (signal?: AbortSignal): Promise<void> => {
		setState((prev) => ({ ...prev, loading: true, error: null }));

		const result = await xfetchApi<FriendListResponse>(FRIENDS_API_ENDPOINTS.LIST, {
			method: "GET",
			signal,
			operation: "Fetch friends list",
		});

		if (result.status === "error") {
			if (result.error.isAbortError()) {
				return;
			}

			setState((prev) => ({
				...prev,
				loading: false,
				error: result.error.toUserMessage(),
			}));

			console.error("[useFriends] Failed to fetch friends:", result.error.toDetailedMessage());
			return;
		}

		setState({
			friends: result.data.friends.sort(sortByName),
			incoming: result.data.incoming.sort(sortByName),
			outgoing: result.data.outgoing.sort(sortByName),
			loading: false,
			error: null,
		});
	}, []);

	useEffect(() => {
		const controller = new AbortController();
		fetchFriends(controller.signal);
		return () => controller.abort();
	}, [fetchFriends]);

	const refresh = useCallback(async (): Promise<void> => {
		await fetchFriends();
	}, [fetchFriends]);

	const sendRequest = useCallback(
		async (userId: string): Promise<void> => {
			if (!userId || userId.trim().length === 0) {
				throw new AppError(
					"User ID is required to send a friend request",
					ErrorSource.INTERNAL,
					ErrorCategory.VALIDATION,
					{ operation: "Send friend request" },
				);
			}

			const result = await xfetchApi<{
				friendId: string;
				status: string;
				user: { id: string; name: string; email: string; avatarUrl?: string };
			}>(FRIENDS_API_ENDPOINTS.REQUEST, {
				method: "POST",
				body: { userId },
				operation: "Send friend request",
			});

			if (result.status === "error") {
				throw result.error;
			}

			const responseData = result.data;

			if (responseData.status === "friend") {
				await refresh();
				return;
			}

			const newItem: FriendItem = {
				id: responseData.user.id,
				friendId: responseData.friendId,
				name: responseData.user.name,
				email: responseData.user.email,
				avatarUrl: responseData.user.avatarUrl,
				status: "outgoing",
				sharedCount: 0,
				lastActive: new Date().toISOString(),
				createdAt: new Date().toISOString(),
			};

			setState((prev) => ({
				...prev,
				outgoing: [newItem, ...prev.outgoing].sort(sortByName),
			}));
		},
		[refresh],
	);

	const acceptRequest = useCallback(
		async (friendId: string): Promise<void> => {
			const targetItem = state.incoming.find((item) => item.friendId === friendId);

			if (!targetItem) {
				throw new AppError(
					`Friend request with ID "${friendId}" not found`,
					ErrorSource.INTERNAL,
					ErrorCategory.NOT_FOUND,
					{ operation: "Accept friend request" },
				);
			}

			setState((prev) => ({
				...prev,
				incoming: prev.incoming.filter((item) => item.friendId !== friendId),
				friends: [{ ...targetItem, status: "friend" as const }, ...prev.friends].sort(sortByName),
			}));

			const result = await xfetchApi<null>(FRIENDS_API_ENDPOINTS.ACCEPT(friendId), {
				method: "PATCH",
				operation: "Accept friend request",
			});

			if (result.status === "error") {
				setState((prev) => ({
					...prev,
					friends: prev.friends.filter((item) => item.friendId !== friendId),
					incoming: [targetItem, ...prev.incoming].sort(sortByName),
				}));
				throw result.error;
			}
		},
		[state.incoming],
	);

	const rejectRequest = useCallback(
		async (friendId: string): Promise<void> => {
			const targetItem = state.incoming.find((item) => item.friendId === friendId);

			setState((prev) => ({
				...prev,
				incoming: prev.incoming.filter((item) => item.friendId !== friendId),
			}));

			const result = await xfetchApi<null>(FRIENDS_API_ENDPOINTS.REJECT(friendId), {
				method: "DELETE",
				operation: "Reject friend request",
			});

			if (result.status === "error") {
				if (targetItem) {
					setState((prev) => ({
						...prev,
						incoming: [targetItem, ...prev.incoming].sort(sortByName),
					}));
				}
				throw result.error;
			}
		},
		[state.incoming],
	);

	const cancelRequest = useCallback(
		async (friendId: string): Promise<void> => {
			const targetItem = state.outgoing.find((item) => item.friendId === friendId);

			setState((prev) => ({
				...prev,
				outgoing: prev.outgoing.filter((item) => item.friendId !== friendId),
			}));

			const result = await xfetchApi<null>(FRIENDS_API_ENDPOINTS.CANCEL(friendId), {
				method: "DELETE",
				operation: "Cancel friend request",
			});

			if (result.status === "error") {
				if (targetItem) {
					setState((prev) => ({
						...prev,
						outgoing: [targetItem, ...prev.outgoing].sort(sortByName),
					}));
				}
				throw result.error;
			}
		},
		[state.outgoing],
	);

	const removeFriend = useCallback(
		async (friendId: string): Promise<void> => {
			const targetItem = state.friends.find((item) => item.friendId === friendId);

			setState((prev) => ({
				...prev,
				friends: prev.friends.filter((item) => item.friendId !== friendId),
			}));

			const result = await xfetchApi<null>(FRIENDS_API_ENDPOINTS.REMOVE(friendId), {
				method: "DELETE",
				operation: "Remove friend",
			});

			if (result.status === "error") {
				if (targetItem) {
					setState((prev) => ({
						...prev,
						friends: [targetItem, ...prev.friends].sort(sortByName),
					}));
				}
				throw result.error;
			}
		},
		[state.friends],
	);

	return {
		friends: state.friends,
		incoming: state.incoming,
		outgoing: state.outgoing,
		loading: state.loading,
		error: state.error,
		refresh,
		sendRequest,
		acceptRequest,
		rejectRequest,
		cancelRequest,
		removeFriend,
	};
}

export function useUserSearch(): UseUserSearchReturn {
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<UserSearchResult[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const controller = new AbortController();

		const timeoutId = setTimeout(async () => {
			setLoading(true);
			setError(null);

			const result = await xfetchApi<{ users: UserSearchResult[] }>(FRIENDS_API_ENDPOINTS.SEARCH(query), {
				method: "GET",
				signal: controller.signal,
				operation: "Search users",
			});

			if (result.status === "error") {
				if (!result.error.isAbortError()) {
					setError(result.error.toUserMessage());
					console.error("[useUserSearch] Search failed:", result.error.toDetailedMessage());
				}
				setLoading(false);
				return;
			}

			setResults(result.data.users);
			setLoading(false);
		}, SEARCH_DEBOUNCE_MS);

		return () => {
			clearTimeout(timeoutId);
			controller.abort();
		};
	}, [query]);

	const clearSearch = useCallback((): void => {
		setQuery("");
		setResults([]);
		setError(null);
	}, []);

	return {
		query,
		setQuery,
		results,
		loading,
		error,
		clearSearch,
	};
}

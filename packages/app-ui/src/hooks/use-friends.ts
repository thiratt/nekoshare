import { useCallback, useEffect, useState } from "react";

import { AppError, ErrorCategory, ErrorSource } from "@workspace/app-ui/lib/errors";
import { xfetchApi } from "@workspace/app-ui/lib/xfetch";
import type { FriendItem, FriendListResponse, UserSearchResult } from "@workspace/app-ui/types/friends";

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
const MINIMUM_SEARCH_LENGTH = 2;

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
	readonly acceptRequest: (friendshipId: string) => Promise<void>;
	readonly rejectRequest: (friendshipId: string) => Promise<void>;
	readonly cancelRequest: (friendshipId: string) => Promise<void>;
	readonly removeFriend: (friendshipId: string) => Promise<void>;
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
				friendshipId: string;
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
				friendshipId: responseData.friendshipId,
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
		async (friendshipId: string): Promise<void> => {
			const targetItem = state.incoming.find((item) => item.friendshipId === friendshipId);

			if (!targetItem) {
				throw new AppError(
					`Friend request with ID "${friendshipId}" not found`,
					ErrorSource.INTERNAL,
					ErrorCategory.NOT_FOUND,
					{ operation: "Accept friend request" },
				);
			}

			setState((prev) => ({
				...prev,
				incoming: prev.incoming.filter((item) => item.friendshipId !== friendshipId),
				friends: [{ ...targetItem, status: "friend" as const }, ...prev.friends].sort(sortByName),
			}));

			const result = await xfetchApi<null>(FRIENDS_API_ENDPOINTS.ACCEPT(friendshipId), {
				method: "PATCH",
				operation: "Accept friend request",
			});

			if (result.status === "error") {
				setState((prev) => ({
					...prev,
					friends: prev.friends.filter((item) => item.friendshipId !== friendshipId),
					incoming: [targetItem, ...prev.incoming].sort(sortByName),
				}));
				throw result.error;
			}
		},
		[state.incoming],
	);

	const rejectRequest = useCallback(
		async (friendshipId: string): Promise<void> => {
			const targetItem = state.incoming.find((item) => item.friendshipId === friendshipId);

			setState((prev) => ({
				...prev,
				incoming: prev.incoming.filter((item) => item.friendshipId !== friendshipId),
			}));

			const result = await xfetchApi<null>(FRIENDS_API_ENDPOINTS.REJECT(friendshipId), {
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
		async (friendshipId: string): Promise<void> => {
			const targetItem = state.outgoing.find((item) => item.friendshipId === friendshipId);

			setState((prev) => ({
				...prev,
				outgoing: prev.outgoing.filter((item) => item.friendshipId !== friendshipId),
			}));

			const result = await xfetchApi<null>(FRIENDS_API_ENDPOINTS.CANCEL(friendshipId), {
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
		async (friendshipId: string): Promise<void> => {
			const targetItem = state.friends.find((item) => item.friendshipId === friendshipId);

			setState((prev) => ({
				...prev,
				friends: prev.friends.filter((item) => item.friendshipId !== friendshipId),
			}));

			const result = await xfetchApi<null>(FRIENDS_API_ENDPOINTS.REMOVE(friendshipId), {
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
		if (query.length < MINIMUM_SEARCH_LENGTH) {
			setResults([]);
			setError(null);
			return;
		}

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

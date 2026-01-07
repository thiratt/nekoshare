import { useCallback, useEffect, useState } from "react";

import { xfetch } from "@workspace/app-ui/lib/xfetch";
import type { FriendItem, FriendListResponse, UserSearchResult } from "@workspace/app-ui/types/friends";

const sortByName = (a: FriendItem, b: FriendItem) => a.name.localeCompare(b.name);

export interface UseFriendsState {
	friends: FriendItem[];
	incoming: FriendItem[];
	outgoing: FriendItem[];
	loading: boolean;
	error: string | null;
}

export function useFriends() {
	const [state, setState] = useState<UseFriendsState>({
		friends: [],
		incoming: [],
		outgoing: [],
		loading: true,
		error: null,
	});

	const fetchFriends = useCallback(async (signal?: AbortSignal) => {
		setState((prev) => ({ ...prev, loading: true, error: null }));

		try {
			const response = await xfetch("/friends", { method: "GET", signal });

			if (!response.ok) {
				throw new Error("Failed to fetch friends");
			}

			const result = await response.json();

			if (!result.success) {
				throw new Error(result.message || "Failed to fetch friends");
			}

			const data = result.data as FriendListResponse;
			setState({
				friends: data.friends.sort(sortByName),
				incoming: data.incoming.sort(sortByName),
				outgoing: data.outgoing.sort(sortByName),
				loading: false,
				error: null,
			});
		} catch (err) {
			if (err instanceof Error && err.name === "AbortError") return;
			setState((prev) => ({
				...prev,
				loading: false,
				error: err instanceof Error ? err.message : "เกิดข้อผิดพลาด",
			}));
			console.error("Failed to fetch friends:", err);
		}
	}, []);

	useEffect(() => {
		const controller = new AbortController();
		fetchFriends(controller.signal);
		return () => controller.abort();
	}, [fetchFriends]);

	const refresh = useCallback(async () => {
		await fetchFriends();
	}, [fetchFriends]);

	// Send friend request
	const sendRequest = useCallback(
		async (userId: string): Promise<void> => {
			const response = await xfetch("/friends/request", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ userId }),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.message || "Failed to send friend request");
			}

			const result = await response.json();

			if (!result.success) {
				throw new Error(result.message || "Failed to send friend request");
			}

			// If mutual request, they become friends immediately
			if (result.data.status === "friend") {
				await refresh();
			} else {
				// Add to outgoing list
				const newItem: FriendItem = {
					id: result.data.user.id,
					friendshipId: result.data.friendshipId,
					name: result.data.user.name,
					email: result.data.user.email,
					avatarUrl: result.data.user.avatarUrl,
					status: "outgoing",
					sharedCount: 0,
					lastActive: new Date().toISOString(),
					createdAt: new Date().toISOString(),
				};
				setState((prev) => ({
					...prev,
					outgoing: [newItem, ...prev.outgoing].sort(sortByName),
				}));
			}
		},
		[refresh]
	);

	// Accept incoming request
	const acceptRequest = useCallback(
		async (friendshipId: string): Promise<void> => {
			// Optimistic update
			const targetItem = state.incoming.find((item) => item.friendshipId === friendshipId);
			if (targetItem) {
				setState((prev) => ({
					...prev,
					incoming: prev.incoming.filter((item) => item.friendshipId !== friendshipId),
					friends: [{ ...targetItem, status: "friend" as const }, ...prev.friends].sort(sortByName),
				}));
			}

			try {
				const response = await xfetch(`/friends/${friendshipId}/accept`, { method: "PATCH" });

				if (!response.ok) {
					throw new Error("Failed to accept friend request");
				}

				const result = await response.json();
				if (!result.success) {
					throw new Error(result.message || "Failed to accept friend request");
				}
			} catch (err) {
				// Rollback on error
				if (targetItem) {
					setState((prev) => ({
						...prev,
						friends: prev.friends.filter((item) => item.friendshipId !== friendshipId),
						incoming: [targetItem, ...prev.incoming].sort(sortByName),
					}));
				}
				throw err;
			}
		},
		[state.incoming]
	);

	// Reject incoming request
	const rejectRequest = useCallback(
		async (friendshipId: string): Promise<void> => {
			// Optimistic update
			const targetItem = state.incoming.find((item) => item.friendshipId === friendshipId);
			setState((prev) => ({
				...prev,
				incoming: prev.incoming.filter((item) => item.friendshipId !== friendshipId),
			}));

			try {
				const response = await xfetch(`/friends/${friendshipId}/reject`, { method: "DELETE" });

				if (!response.ok) {
					throw new Error("Failed to reject friend request");
				}

				const result = await response.json();
				if (!result.success) {
					throw new Error(result.message || "Failed to reject friend request");
				}
			} catch (err) {
				// Rollback on error
				if (targetItem) {
					setState((prev) => ({
						...prev,
						incoming: [targetItem, ...prev.incoming].sort(sortByName),
					}));
				}
				throw err;
			}
		},
		[state.incoming]
	);

	// Cancel outgoing request
	const cancelRequest = useCallback(
		async (friendshipId: string): Promise<void> => {
			// Optimistic update
			const targetItem = state.outgoing.find((item) => item.friendshipId === friendshipId);
			setState((prev) => ({
				...prev,
				outgoing: prev.outgoing.filter((item) => item.friendshipId !== friendshipId),
			}));

			try {
				const response = await xfetch(`/friends/${friendshipId}/cancel`, { method: "DELETE" });

				if (!response.ok) {
					throw new Error("Failed to cancel friend request");
				}

				const result = await response.json();
				if (!result.success) {
					throw new Error(result.message || "Failed to cancel friend request");
				}
			} catch (err) {
				// Rollback on error
				if (targetItem) {
					setState((prev) => ({
						...prev,
						outgoing: [targetItem, ...prev.outgoing].sort(sortByName),
					}));
				}
				throw err;
			}
		},
		[state.outgoing]
	);

	// Remove friend
	const removeFriend = useCallback(
		async (friendshipId: string): Promise<void> => {
			// Optimistic update
			const targetItem = state.friends.find((item) => item.friendshipId === friendshipId);
			setState((prev) => ({
				...prev,
				friends: prev.friends.filter((item) => item.friendshipId !== friendshipId),
			}));

			try {
				const response = await xfetch(`/friends/${friendshipId}`, { method: "DELETE" });

				if (!response.ok) {
					throw new Error("Failed to remove friend");
				}

				const result = await response.json();
				if (!result.success) {
					throw new Error(result.message || "Failed to remove friend");
				}
			} catch (err) {
				// Rollback on error
				if (targetItem) {
					setState((prev) => ({
						...prev,
						friends: [targetItem, ...prev.friends].sort(sortByName),
					}));
				}
				throw err;
			}
		},
		[state.friends]
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
	} as const;
}

export type UseFriendsReturn = ReturnType<typeof useFriends>;

export function useUserSearch() {
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<UserSearchResult[]>([]);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (query.length < 2) {
			setResults([]);
			return;
		}

		const controller = new AbortController();
		const timeoutId = setTimeout(async () => {
			setLoading(true);
			try {
				const response = await xfetch(`/friends/search?q=${encodeURIComponent(query)}`, {
					method: "GET",
					signal: controller.signal,
				});

				if (!response.ok) {
					throw new Error("Search failed");
				}

				const result = await response.json();
				if (result.success) {
					setResults(result.data.users);
				}
			} catch (err) {
				if (err instanceof Error && err.name !== "AbortError") {
					console.error("Search error:", err);
				}
			} finally {
				setLoading(false);
			}
		}, 300);

		return () => {
			clearTimeout(timeoutId);
			controller.abort();
		};
	}, [query]);

	const clearSearch = useCallback(() => {
		setQuery("");
		setResults([]);
	}, []);

	return { query, setQuery, results, loading, clearSearch } as const;
}

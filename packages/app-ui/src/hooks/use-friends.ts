import { useCallback, useEffect, useMemo, useState } from "react";

import { AppError, ErrorCategory, ErrorSource, type Result } from "@workspace/app-ui/lib/errors";
import { PacketType } from "@workspace/app-ui/lib/nk-socket/protocol";
import { xfetchApi } from "@workspace/app-ui/lib/xfetch";
import type { FriendItem, FriendListResponse, UserSearchResult } from "@workspace/app-ui/types/friends";

import { usePacketRouter } from "./usePacketRouter";
import type {
	FriendPresencePayload,
	FriendRemovedPayload,
	FriendRequestAcceptedPayload,
	FriendRequestCancelledPayload,
	FriendRequestReceivedPayload,
	FriendRequestRejectedPayload,
} from "../lib/nk-socket/payload";

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
const nowIso = (): string => new Date().toISOString();

type FriendUserPayload = FriendRequestReceivedPayload["user"];

function createFriendItem(
	user: FriendUserPayload,
	friendId: string,
	status: FriendItem["status"],
	createdAt = nowIso(),
): FriendItem {
	return {
		id: user.id,
		friendId,
		name: user.name,
		email: user.email,
		avatarUrl: user.avatarUrl,
		status,
		lastActive: nowIso(),
		createdAt,
	};
}

function addOrReplaceFriend(list: FriendItem[], item: FriendItem): FriendItem[] {
	const filtered = list.filter((entry) => entry.friendId !== item.friendId);
	return [item, ...filtered].sort(sortByName);
}

function setFriendPresence(friends: FriendItem[], userId: string, isOnline: boolean): FriendItem[] {
	let changed = false;

	const nextFriends = friends.map((friend) => {
		if (friend.id !== userId || friend.isOnline === isOnline) {
			return friend;
		}

		changed = true;
		return { ...friend, isOnline };
	});

	return changed ? nextFriends : friends;
}

function removeByFriendId(list: FriendItem[], friendId: string): FriendItem[] {
	const nextList = list.filter((item) => item.friendId !== friendId);
	return nextList.length === list.length ? list : nextList;
}

function applySocketResult<T>(result: Result<T>, packetName: string, onSuccess: (payload: T) => void): void {
	if (result.status === "success") {
		onSuccess(result.data);
		return;
	}

	console.error(`[useFriends] Failed to parse ${packetName}:`, result.error.message);
}

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
			[PacketType.FRIEND_REQUEST_RECEIVED]: (result: Result<FriendRequestReceivedPayload>) => {
				applySocketResult(result, "FRIEND_REQUEST_RECEIVED", (payload) => {
					setState((prev) => {
						if (prev.incoming.some((item) => item.friendId === payload.friendId)) {
							return prev;
						}

						const incomingItem = createFriendItem(
							payload.user,
							payload.friendId,
							"incoming",
							payload.createdAt,
						);
						return {
							...prev,
							incoming: addOrReplaceFriend(prev.incoming, incomingItem),
						};
					});
				});
			},

			[PacketType.FRIEND_REQUEST_ACCEPTED]: (result: Result<FriendRequestAcceptedPayload>) => {
				applySocketResult(result, "FRIEND_REQUEST_ACCEPTED", (payload) => {
					setState((prev) => {
						const outgoingItem = prev.outgoing.find((item) => item.friendId === payload.friendId);
						const acceptedFriend = outgoingItem
							? { ...outgoingItem, status: "friend" as const }
							: createFriendItem(payload.user, payload.friendId, "friend");

						return {
							...prev,
							outgoing: removeByFriendId(prev.outgoing, payload.friendId),
							friends: addOrReplaceFriend(prev.friends, acceptedFriend),
						};
					});
				});
			},

			[PacketType.FRIEND_REQUEST_REJECTED]: (result: Result<FriendRequestRejectedPayload>) => {
				applySocketResult(result, "FRIEND_REQUEST_REJECTED", (payload) => {
					setState((prev) => {
						const nextOutgoing = removeByFriendId(prev.outgoing, payload.friendId);

						if (nextOutgoing === prev.outgoing) {
							return prev;
						}

						return {
							...prev,
							outgoing: nextOutgoing,
						};
					});
				});
			},

			[PacketType.FRIEND_REQUEST_CANCELLED]: (result: Result<FriendRequestCancelledPayload>) => {
				applySocketResult(result, "FRIEND_REQUEST_CANCELLED", (payload) => {
					setState((prev) => {
						const nextIncoming = removeByFriendId(prev.incoming, payload.friendId);

						if (nextIncoming === prev.incoming) {
							return prev;
						}

						return {
							...prev,
							incoming: nextIncoming,
						};
					});
				});
			},

			[PacketType.FRIEND_REMOVED]: (result: Result<FriendRemovedPayload>) => {
				applySocketResult(result, "FRIEND_REMOVED", (payload) => {
					setState((prev) => {
						const nextFriends = removeByFriendId(prev.friends, payload.friendId);
						const nextIncoming = removeByFriendId(prev.incoming, payload.friendId);
						const nextOutgoing = removeByFriendId(prev.outgoing, payload.friendId);

						if (
							nextFriends === prev.friends &&
							nextIncoming === prev.incoming &&
							nextOutgoing === prev.outgoing
						) {
							return prev;
						}

						return {
							...prev,
							friends: nextFriends,
							incoming: nextIncoming,
							outgoing: nextOutgoing,
						};
					});
				});
			},

			[PacketType.FRIEND_ONLINE]: (result: Result<FriendPresencePayload>) => {
				applySocketResult(result, "FRIEND_ONLINE", ({ userId }) => {
					setState((prev) => {
						const nextFriends = setFriendPresence(prev.friends, userId, true);

						if (nextFriends === prev.friends) {
							return prev;
						}

						return {
							...prev,
							friends: nextFriends,
						};
					});
				});
			},

			[PacketType.FRIEND_OFFLINE]: (result: Result<FriendPresencePayload>) => {
				applySocketResult(result, "FRIEND_OFFLINE", ({ userId }) => {
					setState((prev) => {
						const nextFriends = setFriendPresence(prev.friends, userId, false);

						if (nextFriends === prev.friends) {
							return prev;
						}

						return {
							...prev,
							friends: nextFriends,
						};
					});
				});
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

	const runOptimisticMutation = useCallback(
		async <T>(
			applyOptimistic: (prev: UseFriendsState) => UseFriendsState,
			rollbackOptimistic: (prev: UseFriendsState) => UseFriendsState,
			request: () => Promise<Result<T>>,
		): Promise<T> => {
			setState(applyOptimistic);

			const result = await request();
			if (result.status === "error") {
				setState(rollbackOptimistic);
				throw result.error;
			}

			return result.data;
		},
		[],
	);

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

			const newItem = createFriendItem(responseData.user, responseData.friendId, "outgoing");

			setState((prev) => ({
				...prev,
				outgoing: addOrReplaceFriend(prev.outgoing, newItem),
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

			await runOptimisticMutation(
				(prev) => ({
					...prev,
					incoming: removeByFriendId(prev.incoming, friendId),
					friends: addOrReplaceFriend(prev.friends, { ...targetItem, status: "friend" as const }),
				}),
				(prev) => ({
					...prev,
					friends: removeByFriendId(prev.friends, friendId),
					incoming: addOrReplaceFriend(prev.incoming, targetItem),
				}),
				() =>
					xfetchApi<null>(FRIENDS_API_ENDPOINTS.ACCEPT(friendId), {
						method: "PATCH",
						operation: "Accept friend request",
					}),
			);
		},
		[runOptimisticMutation, state.incoming],
	);

	const rejectRequest = useCallback(
		async (friendId: string): Promise<void> => {
			const targetItem = state.incoming.find((item) => item.friendId === friendId);

			await runOptimisticMutation(
				(prev) => ({
					...prev,
					incoming: removeByFriendId(prev.incoming, friendId),
				}),
				(prev) => ({
					...prev,
					incoming: targetItem ? addOrReplaceFriend(prev.incoming, targetItem) : prev.incoming,
				}),
				() =>
					xfetchApi<null>(FRIENDS_API_ENDPOINTS.REJECT(friendId), {
						method: "DELETE",
						operation: "Reject friend request",
					}),
			);
		},
		[runOptimisticMutation, state.incoming],
	);

	const cancelRequest = useCallback(
		async (friendId: string): Promise<void> => {
			const targetItem = state.outgoing.find((item) => item.friendId === friendId);

			await runOptimisticMutation(
				(prev) => ({
					...prev,
					outgoing: removeByFriendId(prev.outgoing, friendId),
				}),
				(prev) => ({
					...prev,
					outgoing: targetItem ? addOrReplaceFriend(prev.outgoing, targetItem) : prev.outgoing,
				}),
				() =>
					xfetchApi<null>(FRIENDS_API_ENDPOINTS.CANCEL(friendId), {
						method: "DELETE",
						operation: "Cancel friend request",
					}),
			);
		},
		[runOptimisticMutation, state.outgoing],
	);

	const removeFriend = useCallback(
		async (friendId: string): Promise<void> => {
			const targetItem = state.friends.find((item) => item.friendId === friendId);

			await runOptimisticMutation(
				(prev) => ({
					...prev,
					friends: removeByFriendId(prev.friends, friendId),
				}),
				(prev) => ({
					...prev,
					friends: targetItem ? addOrReplaceFriend(prev.friends, targetItem) : prev.friends,
				}),
				() =>
					xfetchApi<null>(FRIENDS_API_ENDPOINTS.REMOVE(friendId), {
						method: "DELETE",
						operation: "Remove friend",
					}),
			);
		},
		[runOptimisticMutation, state.friends],
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

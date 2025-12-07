import { useState, useEffect, useCallback } from "react";

import { xfetch } from "@workspace/app-ui/lib/xfetch";
import type { FriendProps } from "@workspace/app-ui/types/friends";

const sortByName = (a: FriendProps, b: FriendProps) => a.name.localeCompare(b.name);

export function useFriends() {
	const [items, setItems] = useState<FriendProps[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchFriends = useCallback(async (signal?: AbortSignal) => {
		setLoading(true);
		setError(null);

		try {
			const response = await xfetch("/friends", { method: "GET", signal });

			if (!response.ok) {
				throw new Error("Failed to fetch friends");
			}

			const result = await response.json();

			if (!result.success) {
				throw new Error(result.message || "Failed to fetch friends");
			}

			setItems(result.data.friends.sort(sortByName));
		} catch (err) {
			if (err instanceof Error && err.name === "AbortError") return;
			setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
			console.error("Failed to fetch friends:", err);
		} finally {
			setLoading(false);
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

	const invite = useCallback(async (payload: { email: string; message?: string }): Promise<FriendProps> => {
		const response = await xfetch("/friends/invite", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			throw new Error(errorData.message || "Failed to invite friend");
		}

		const result = await response.json();

		if (!result.success) {
			throw new Error(result.message || "Failed to invite friend");
		}

		const newFriend = result.data.friend;
		setItems((prev) => [newFriend, ...prev].sort(sortByName));
		return newFriend;
	}, []);

	const revoke = useCallback(async (ids: string[]): Promise<void> => {
		const response = await xfetch("/friends/revoke", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ ids }),
		});

		if (!response.ok) {
			throw new Error("Failed to revoke friends");
		}

		const result = await response.json();

		if (!result.success) {
			throw new Error(result.message || "Failed to revoke friends");
		}

		const deletedSet = new Set(result.data.deleted);
		setItems((prev) => prev.filter((friend) => !deletedSet.has(friend.id)));
	}, []);

	const accept = useCallback(async (id: string): Promise<void> => {
		const response = await xfetch(`/friends/${id}/accept`, { method: "PATCH" });

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			throw new Error(errorData.message || "Failed to accept friend request");
		}

		const result = await response.json();

		if (!result.success) {
			throw new Error(result.message || "Failed to accept friend request");
		}

		setItems((prev) =>
			prev.map((friend) => (friend.id === id ? { ...friend, status: "active" as const } : friend))
		);
	}, []);

	const deny = useCallback(async (id: string): Promise<void> => {
		const response = await xfetch(`/friends/${id}`, { method: "DELETE" });

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			throw new Error(errorData.message || "Failed to deny friend request");
		}

		const result = await response.json();

		if (!result.success) {
			throw new Error(result.message || "Failed to deny friend request");
		}

		setItems((prev) => prev.filter((friend) => friend.id !== id));
	}, []);

	return { items, loading, error, refresh, invite, revoke, accept, deny } as const;
}

export type UseFriendsReturn = ReturnType<typeof useFriends>;

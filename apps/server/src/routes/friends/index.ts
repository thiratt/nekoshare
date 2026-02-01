import { eq, or, and, count, sql, like } from "drizzle-orm";

import { db } from "@/adapters/db";
import { friend, user, transferHistory } from "@/adapters/db/schemas";
import { createRouter } from "@/core/utils/router";
import {
	broadcastFriendRequestReceived,
	broadcastFriendRequestAccepted,
	broadcastFriendRequestRejected,
	broadcastFriendRequestCancelled,
	broadcastFriendRemoved,
} from "@/core/socket/ws/controllers";
import { wsSessionManager } from "@/core/socket/ws/connection";
import { success, error } from "@/types";
import type { FriendItem, FriendStatus, FriendListResponse, UserSearchResult } from "@/types/api";

const uuidv4 = () => crypto.randomUUID();

const app = createRouter();

async function mapFriendToItem(
	f: typeof friend.$inferSelect,
	currentUserId: string,
	friendUser: typeof user.$inferSelect | undefined,
	sharedCountMap: Map<string, number>,
): Promise<FriendItem> {
	const isRequester = f.requesterId === currentUserId;
	const friendUserId = isRequester ? f.receiverId : f.requesterId;

	let status: FriendStatus;
	if (f.status === "accepted") {
		status = "friend";
	} else if (f.status === "blocked") {
		status = "blocked";
	} else if (f.status === "pending") {
		status = isRequester ? "outgoing" : "incoming";
	} else {
		status = "none";
	}

	const isOnline = wsSessionManager.isUserOnline(friendUserId);

	return {
		id: friendUserId,
		friendId: f.id,
		name: friendUser?.name ?? "Unknown",
		email: friendUser?.email ?? "",
		avatarUrl: friendUser?.image ?? undefined,
		status,
		isOnline,
		sharedCount: sharedCountMap.get(friendUserId) ?? 0,
		lastActive: friendUser?.lastActiveAt?.toISOString() ?? new Date().toISOString(),
		createdAt: f.createdAt.toISOString(),
	};
}

app.get("/", async (c) => {
	const currentUser = c.get("user");

	const friends = await db.query.friend.findMany({
		where: or(eq(friend.requesterId, currentUser.id), eq(friend.receiverId, currentUser.id)),
	});

	if (friends.length === 0) {
		return c.json(
			success<FriendListResponse>({
				friends: [],
				incoming: [],
				outgoing: [],
				total: { friends: 0, incoming: 0, outgoing: 0 },
			}),
		);
	}

	const friendUserIds = friends.map((f) => (f.requesterId === currentUser.id ? f.receiverId : f.requesterId));

	const friendUsers = await db.query.user.findMany({
		where: sql`${user.id} IN (${sql.join(
			friendUserIds.map((id) => sql`${id}`),
			sql`, `,
		)})`,
	});

	const sharedCounts = await db
		.select({
			friendId: sql<string>`CASE 
				WHEN ${transferHistory.senderId} = ${currentUser.id} THEN ${transferHistory.receiverId}
				ELSE ${transferHistory.senderId}
			END`.as("friendId"),
			count: count(),
		})
		.from(transferHistory)
		.where(or(eq(transferHistory.senderId, currentUser.id), eq(transferHistory.receiverId, currentUser.id)))
		.groupBy(sql`friendId`);

	const sharedCountMap = new Map(sharedCounts.map((sc) => [sc.friendId, sc.count]));
	const userMap = new Map(friendUsers.map((u) => [u.id, u]));

	const friendsList: FriendItem[] = [];
	const incoming: FriendItem[] = [];
	const outgoing: FriendItem[] = [];

	for (const f of friends) {
		const friendUserId = f.requesterId === currentUser.id ? f.receiverId : f.requesterId;
		const friendUser = userMap.get(friendUserId);
		const item = await mapFriendToItem(f, currentUser.id, friendUser, sharedCountMap);

		if (item.status === "friend") {
			friendsList.push(item);
		} else if (item.status === "incoming") {
			incoming.push(item);
		} else if (item.status === "outgoing") {
			outgoing.push(item);
		}
	}

	const sortByName = (a: FriendItem, b: FriendItem) => a.name.localeCompare(b.name);
	friendsList.sort(sortByName);
	incoming.sort(sortByName);
	outgoing.sort(sortByName);

	return c.json(
		success<FriendListResponse>({
			friends: friendsList,
			incoming,
			outgoing,
			total: { friends: friends.length, incoming: incoming.length, outgoing: outgoing.length },
		}),
	);
});

app.post("/request", async (c) => {
	const currentUser = c.get("user");
	const body = await c.req.json<{ userId?: string; email?: string }>();

	let targetUser: typeof user.$inferSelect | undefined;

	if (body.userId) {
		targetUser = await db.query.user.findFirst({
			where: eq(user.id, body.userId),
		});
	} else if (body.email) {
		targetUser = await db.query.user.findFirst({
			where: eq(user.email, body.email),
		});
	} else {
		return c.json(error("VALIDATION_ERROR", "userId or email is required"), 400);
	}

	if (!targetUser) {
		return c.json(error("NOT_FOUND", "User not found"), 404);
	}

	if (targetUser.id === currentUser.id) {
		return c.json(error("VALIDATION_ERROR", "Cannot add yourself as a friend"), 400);
	}

	const existingfriend = await db.query.friend.findFirst({
		where: or(
			and(eq(friend.requesterId, currentUser.id), eq(friend.receiverId, targetUser.id)),
			and(eq(friend.requesterId, targetUser.id), eq(friend.receiverId, currentUser.id)),
		),
	});

	if (existingfriend) {
		if (existingfriend.status === "accepted") {
			return c.json(error("ALREADY_EXISTS", "Already friends"), 409);
		}
		if (existingfriend.status === "pending") {
			if (existingfriend.requesterId === targetUser.id) {
				await db.update(friend).set({ status: "accepted" }).where(eq(friend.id, existingfriend.id));
				return c.json(
					success({
						friendId: existingfriend.id,
						status: "friend" as FriendStatus,
						message: "Friend request accepted (mutual request)",
					}),
					200,
				);
			}
			return c.json(error("ALREADY_EXISTS", "Friend request already sent"), 409);
		}
		if (existingfriend.status === "blocked") {
			return c.json(error("BLOCKED", "Cannot send request to this user"), 403);
		}
	}

	const newfriendId = uuidv4();
	const createdAt = new Date();
	await db.insert(friend).values({
		id: newfriendId,
		requesterId: currentUser.id,
		receiverId: targetUser.id,
		status: "pending",
		createdAt,
	});

	broadcastFriendRequestReceived(targetUser.id, {
		friendId: newfriendId,
		user: {
			id: currentUser.id,
			name: currentUser.name ?? "Unknown",
			email: currentUser.email ?? "",
			avatarUrl: currentUser.image ?? undefined,
		},
		createdAt: createdAt.toISOString(),
	});

	return c.json(
		success({
			friendId: newfriendId,
			status: "outgoing" as FriendStatus,
			user: {
				id: targetUser.id,
				name: targetUser.name,
				email: targetUser.email,
				avatarUrl: targetUser.image ?? undefined,
			},
		}),
		201,
	);
});

app.patch("/:id/accept", async (c) => {
	const currentUser = c.get("user");
	const friendId = c.req.param("id");

	const existingfriend = await db.query.friend.findFirst({
		where: and(eq(friend.id, friendId), eq(friend.receiverId, currentUser.id), eq(friend.status, "pending")),
	});

	if (!existingfriend) {
		return c.json(error("NOT_FOUND", "Friend request not found"), 404);
	}

	await db.update(friend).set({ status: "accepted" }).where(eq(friend.id, friendId));

	broadcastFriendRequestAccepted(existingfriend.requesterId, {
		friendId: friendId,
		user: {
			id: currentUser.id,
			name: currentUser.name ?? "Unknown",
			email: currentUser.email ?? "",
			avatarUrl: currentUser.image ?? undefined,
		},
	});

	return c.json(
		success({
			friendId,
			status: "friend" as FriendStatus,
		}),
	);
});

app.delete("/:id/reject", async (c) => {
	const currentUser = c.get("user");
	const friendId = c.req.param("id");

	const existingfriend = await db.query.friend.findFirst({
		where: and(eq(friend.id, friendId), eq(friend.receiverId, currentUser.id), eq(friend.status, "pending")),
	});

	if (!existingfriend) {
		return c.json(error("NOT_FOUND", "Friend request not found"), 404);
	}

	await db.delete(friend).where(eq(friend.id, friendId));

	broadcastFriendRequestRejected(existingfriend.requesterId, {
		friendId: friendId,
	});

	return c.json(
		success({
			friendId,
			status: "none" as FriendStatus,
		}),
	);
});

app.delete("/:id/cancel", async (c) => {
	const currentUser = c.get("user");
	const friendId = c.req.param("id");

	const existingfriend = await db.query.friend.findFirst({
		where: and(eq(friend.id, friendId), eq(friend.requesterId, currentUser.id), eq(friend.status, "pending")),
	});

	if (!existingfriend) {
		return c.json(error("NOT_FOUND", "Friend request not found"), 404);
	}

	await db.delete(friend).where(eq(friend.id, friendId));

	broadcastFriendRequestCancelled(existingfriend.receiverId, {
		friendId: friendId,
	});

	return c.json(
		success({
			friendId,
			status: "none" as FriendStatus,
		}),
	);
});

app.delete("/:id", async (c) => {
	const currentUser = c.get("user");
	const friendId = c.req.param("id");

	const existingfriend = await db.query.friend.findFirst({
		where: and(
			eq(friend.id, friendId),
			or(eq(friend.requesterId, currentUser.id), eq(friend.receiverId, currentUser.id)),
		),
	});

	if (!existingfriend) {
		return c.json(error("NOT_FOUND", "friend not found"), 404);
	}

	await db.delete(friend).where(eq(friend.id, friendId));

	const otherUserId =
		existingfriend.requesterId === currentUser.id ? existingfriend.receiverId : existingfriend.requesterId;
	broadcastFriendRemoved(otherUserId, {
		friendId: friendId,
	});

	return c.json(
		success({
			friendId,
			status: "none" as FriendStatus,
		}),
	);
});

app.get("/search", async (c) => {
	const currentUser = c.get("user");
	const query = c.req.query("q")?.trim() ?? "";

	const searchPattern = `%${query}%`;

	const matchingUsers = await db.query.user.findMany({
		where: and(
			sql`${user.id} != ${currentUser.id}`,
			or(like(user.email, searchPattern), like(user.name, searchPattern)),
		),
		limit: 10,
	});

	if (matchingUsers.length === 0) {
		return c.json(
			success({
				users: [] as UserSearchResult[],
				total: 0,
			}),
		);
	}

	const userIds = matchingUsers.map((u) => u.id);
	const friends = await db.query.friend.findMany({
		where: and(
			or(eq(friend.requesterId, currentUser.id), eq(friend.receiverId, currentUser.id)),
			or(
				sql`${friend.requesterId} IN (${sql.join(
					userIds.map((id) => sql`${id}`),
					sql`, `,
				)})`,
				sql`${friend.receiverId} IN (${sql.join(
					userIds.map((id) => sql`${id}`),
					sql`, `,
				)})`,
			),
		),
	});

	const friendMap = new Map<string, { status: string; isRequester: boolean }>();
	for (const f of friends) {
		const otherUserId = f.requesterId === currentUser.id ? f.receiverId : f.requesterId;
		friendMap.set(otherUserId, {
			status: f.status,
			isRequester: f.requesterId === currentUser.id,
		});
	}

	const users: UserSearchResult[] = matchingUsers.map((u) => {
		const fs = friendMap.get(u.id);
		let friendStatus: FriendStatus = "none";

		if (fs) {
			if (fs.status === "accepted") {
				friendStatus = "friend";
			} else if (fs.status === "blocked") {
				friendStatus = "blocked";
			} else if (fs.status === "pending") {
				friendStatus = fs.isRequester ? "outgoing" : "incoming";
			}
		}

		return {
			id: u.id,
			name: u.name ?? "",
			email: u.email ?? "",
			avatarUrl: u.image ?? undefined,
			friendStatus,
		};
	});

	return c.json(
		success({
			users,
			total: users.length,
		}),
	);
});

export default app;

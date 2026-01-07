import { eq, or, and, count, sql, like } from "drizzle-orm";

import { db } from "@/adapters/db";
import { friendship, user, transferHistory } from "@/adapters/db/schemas";
import { createRouter } from "@/core/utils/router";
import { success, error } from "@/types";
import type { FriendItem, FriendStatus, FriendListResponse, UserSearchResult } from "@/types/api";

const uuidv4 = () => crypto.randomUUID();

const app = createRouter();

async function mapFriendshipToItem(
	f: typeof friendship.$inferSelect,
	currentUserId: string,
	friendUser: typeof user.$inferSelect | undefined,
	sharedCountMap: Map<string, number>
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

	return {
		id: friendUserId,
		friendshipId: f.id,
		name: friendUser?.name ?? "Unknown",
		email: friendUser?.email ?? "",
		avatarUrl: friendUser?.image ?? undefined,
		status,
		sharedCount: sharedCountMap.get(friendUserId) ?? 0,
		lastActive: friendUser?.updatedAt?.toISOString() ?? new Date().toISOString(),
		createdAt: f.createdAt.toISOString(),
	};
}

app.get("/", async (c) => {
	const currentUser = c.get("user");

	const friendships = await db.query.friendship.findMany({
		where: or(eq(friendship.requesterId, currentUser.id), eq(friendship.receiverId, currentUser.id)),
	});

	if (friendships.length === 0) {
		return c.json(
			success<FriendListResponse>({
				friends: [],
				incoming: [],
				outgoing: [],
				total: { friends: 0, incoming: 0, outgoing: 0 },
			})
		);
	}

	const friendUserIds = friendships.map((f) => (f.requesterId === currentUser.id ? f.receiverId : f.requesterId));

	const friendUsers = await db.query.user.findMany({
		where: sql`${user.id} IN (${sql.join(
			friendUserIds.map((id) => sql`${id}`),
			sql`, `
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

	const friends: FriendItem[] = [];
	const incoming: FriendItem[] = [];
	const outgoing: FriendItem[] = [];

	for (const f of friendships) {
		const friendUserId = f.requesterId === currentUser.id ? f.receiverId : f.requesterId;
		const friendUser = userMap.get(friendUserId);
		const item = await mapFriendshipToItem(f, currentUser.id, friendUser, sharedCountMap);

		if (item.status === "friend") {
			friends.push(item);
		} else if (item.status === "incoming") {
			incoming.push(item);
		} else if (item.status === "outgoing") {
			outgoing.push(item);
		}
	}

	const sortByName = (a: FriendItem, b: FriendItem) => a.name.localeCompare(b.name);
	friends.sort(sortByName);
	incoming.sort(sortByName);
	outgoing.sort(sortByName);

	return c.json(
		success<FriendListResponse>({
			friends,
			incoming,
			outgoing,
			total: { friends: friends.length, incoming: incoming.length, outgoing: outgoing.length },
		})
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

	const existingFriendship = await db.query.friendship.findFirst({
		where: or(
			and(eq(friendship.requesterId, currentUser.id), eq(friendship.receiverId, targetUser.id)),
			and(eq(friendship.requesterId, targetUser.id), eq(friendship.receiverId, currentUser.id))
		),
	});

	if (existingFriendship) {
		if (existingFriendship.status === "accepted") {
			return c.json(error("ALREADY_EXISTS", "Already friends"), 409);
		}
		if (existingFriendship.status === "pending") {
			if (existingFriendship.requesterId === targetUser.id) {
				await db.update(friendship).set({ status: "accepted" }).where(eq(friendship.id, existingFriendship.id));
				return c.json(
					success({
						friendshipId: existingFriendship.id,
						status: "friend" as FriendStatus,
						message: "Friend request accepted (mutual request)",
					}),
					200
				);
			}
			return c.json(error("ALREADY_EXISTS", "Friend request already sent"), 409);
		}
		if (existingFriendship.status === "blocked") {
			return c.json(error("BLOCKED", "Cannot send request to this user"), 403);
		}
	}

	const newFriendshipId = uuidv4();
	await db.insert(friendship).values({
		id: newFriendshipId,
		requesterId: currentUser.id,
		receiverId: targetUser.id,
		status: "pending",
	});

	return c.json(
		success({
			friendshipId: newFriendshipId,
			status: "outgoing" as FriendStatus,
			user: {
				id: targetUser.id,
				name: targetUser.name,
				email: targetUser.email,
				avatarUrl: targetUser.image ?? undefined,
			},
		}),
		201
	);
});

app.patch("/:id/accept", async (c) => {
	const currentUser = c.get("user");
	const friendshipId = c.req.param("id");

	const existingFriendship = await db.query.friendship.findFirst({
		where: and(
			eq(friendship.id, friendshipId),
			eq(friendship.receiverId, currentUser.id),
			eq(friendship.status, "pending")
		),
	});

	if (!existingFriendship) {
		return c.json(error("NOT_FOUND", "Friend request not found"), 404);
	}

	await db.update(friendship).set({ status: "accepted" }).where(eq(friendship.id, friendshipId));

	return c.json(
		success({
			friendshipId,
			status: "friend" as FriendStatus,
		})
	);
});

app.delete("/:id/reject", async (c) => {
	const currentUser = c.get("user");
	const friendshipId = c.req.param("id");

	const existingFriendship = await db.query.friendship.findFirst({
		where: and(
			eq(friendship.id, friendshipId),
			eq(friendship.receiverId, currentUser.id),
			eq(friendship.status, "pending")
		),
	});

	if (!existingFriendship) {
		return c.json(error("NOT_FOUND", "Friend request not found"), 404);
	}

	await db.delete(friendship).where(eq(friendship.id, friendshipId));

	return c.json(
		success({
			friendshipId,
			status: "none" as FriendStatus,
		})
	);
});

app.delete("/:id/cancel", async (c) => {
	const currentUser = c.get("user");
	const friendshipId = c.req.param("id");

	const existingFriendship = await db.query.friendship.findFirst({
		where: and(
			eq(friendship.id, friendshipId),
			eq(friendship.requesterId, currentUser.id),
			eq(friendship.status, "pending")
		),
	});

	if (!existingFriendship) {
		return c.json(error("NOT_FOUND", "Friend request not found"), 404);
	}

	await db.delete(friendship).where(eq(friendship.id, friendshipId));

	return c.json(
		success({
			friendshipId,
			status: "none" as FriendStatus,
		})
	);
});

app.delete("/:id", async (c) => {
	const currentUser = c.get("user");
	const friendshipId = c.req.param("id");

	const existingFriendship = await db.query.friendship.findFirst({
		where: and(
			eq(friendship.id, friendshipId),
			or(eq(friendship.requesterId, currentUser.id), eq(friendship.receiverId, currentUser.id))
		),
	});

	if (!existingFriendship) {
		return c.json(error("NOT_FOUND", "Friendship not found"), 404);
	}

	await db.delete(friendship).where(eq(friendship.id, friendshipId));

	return c.json(
		success({
			friendshipId,
			status: "none" as FriendStatus,
		})
	);
});

app.get("/search", async (c) => {
	const currentUser = c.get("user");
	const query = c.req.query("q")?.trim() ?? "";

	if (query.length < 2) {
		return c.json(
			success({
				users: [] as UserSearchResult[],
				total: 0,
			})
		);
	}

	const searchPattern = `%${query}%`;

	const matchingUsers = await db.query.user.findMany({
		where: and(
			sql`${user.id} != ${currentUser.id}`,
			or(like(user.email, searchPattern), like(user.name, searchPattern))
		),
		limit: 10,
	});

	if (matchingUsers.length === 0) {
		return c.json(
			success({
				users: [] as UserSearchResult[],
				total: 0,
			})
		);
	}

	const userIds = matchingUsers.map((u) => u.id);
	const friendships = await db.query.friendship.findMany({
		where: and(
			or(eq(friendship.requesterId, currentUser.id), eq(friendship.receiverId, currentUser.id)),
			or(
				sql`${friendship.requesterId} IN (${sql.join(
					userIds.map((id) => sql`${id}`),
					sql`, `
				)})`,
				sql`${friendship.receiverId} IN (${sql.join(
					userIds.map((id) => sql`${id}`),
					sql`, `
				)})`
			)
		),
	});

	const friendshipMap = new Map<string, { status: string; isRequester: boolean }>();
	for (const f of friendships) {
		const otherUserId = f.requesterId === currentUser.id ? f.receiverId : f.requesterId;
		friendshipMap.set(otherUserId, {
			status: f.status,
			isRequester: f.requesterId === currentUser.id,
		});
	}

	const users: UserSearchResult[] = matchingUsers.map((u) => {
		const fs = friendshipMap.get(u.id);
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
		})
	);
});

export default app;

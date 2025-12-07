import { eq, or, and, count, sql } from "drizzle-orm";
// import { v4 as uuidv4 } from "uuid";

import { db } from "@/adapters/db";
import { friendship, user, transferHistory } from "@/adapters/db/schemas";
import { createRouter } from "@/core/utils/router";
import { success, error } from "@/types";

const uuidv4 = () => crypto.randomUUID(); // CRITICAL: Replace with secure UUID generator

const app = createRouter();

app.get("/", async (c) => {
	const currentUser = c.get("user");

	const friendships = await db.query.friendship.findMany({
		where: or(eq(friendship.requesterId, currentUser.id), eq(friendship.receiverId, currentUser.id)),
	});

	const friendUserIds = friendships.map((f) => (f.requesterId === currentUser.id ? f.receiverId : f.requesterId));

	if (friendUserIds.length === 0) {
		return c.json(
			success({
				friends: [],
				total: 0,
			})
		);
	}

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

	const friends = friendships.map((f) => {
		const friendUserId = f.requesterId === currentUser.id ? f.receiverId : f.requesterId;
		const friendUser = friendUsers.find((u) => u.id === friendUserId);

		return {
			id: f.id,
			name: friendUser?.name ?? "Unknown",
			email: friendUser?.email ?? "",
			avatarUrl: friendUser?.image ?? undefined,
			status: f.status === "accepted" ? "active" : "pending",
			sharedCount: sharedCountMap.get(friendUserId) ?? 0,
			lastActive: friendUser?.updatedAt?.toISOString() ?? new Date().toISOString(),
			invitedAt: f.createdAt.toISOString(),
		};
	});

	return c.json(
		success({
			friends,
			total: friends.length,
		})
	);
});

app.post("/invite", async (c) => {
	const currentUser = c.get("user");
	const body = await c.req.json<{ email: string; message?: string }>();

	if (!body.email) {
		return c.json(error("VALIDATION_ERROR", "Email is required"), 400);
	}

	const targetUser = await db.query.user.findFirst({
		where: eq(user.email, body.email),
	});

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
		return c.json(error("ALREADY_EXISTS", "Friendship already exists"), 409);
	}

	const newFriendshipId = uuidv4();
	await db.insert(friendship).values({
		id: newFriendshipId,
		requesterId: currentUser.id,
		receiverId: targetUser.id,
		status: "pending",
	});

	const newFriendship = await db.query.friendship.findFirst({
		where: eq(friendship.id, newFriendshipId),
	});

	return c.json(
		success({
			friend: {
				id: newFriendshipId,
				name: targetUser.name,
				email: targetUser.email,
				avatarUrl: targetUser.image ?? undefined,
				status: "pending",
				sharedCount: 0,
				lastActive: targetUser.updatedAt?.toISOString() ?? new Date().toISOString(),
				invitedAt: newFriendship?.createdAt.toISOString() ?? new Date().toISOString(),
			},
			isNew: true,
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

	return c.json(success({ accepted: true }));
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

	return c.json(success({ deleted: true }));
});

app.post("/revoke", async (c) => {
	const currentUser = c.get("user");
	const body = await c.req.json<{ ids: string[] }>();

	if (!body.ids || body.ids.length === 0) {
		return c.json(error("VALIDATION_ERROR", "IDs are required"), 400);
	}

	const deletedIds: string[] = [];

	for (const id of body.ids) {
		const existingFriendship = await db.query.friendship.findFirst({
			where: and(
				eq(friendship.id, id),
				or(eq(friendship.requesterId, currentUser.id), eq(friendship.receiverId, currentUser.id))
			),
		});

		if (existingFriendship) {
			await db.delete(friendship).where(eq(friendship.id, id));
			deletedIds.push(id);
		}
	}

	return c.json(success({ deleted: deletedIds, count: deletedIds.length }));
});

export default app;

import { and, eq, inArray, like, or, sql } from "drizzle-orm";

import { db } from "@/infrastructure/db";
import { friend, users } from "@/infrastructure/db/schemas";

export type FriendRecord = typeof friend.$inferSelect;
export type UserRecord = typeof users.$inferSelect;

export const friendsRepository = {
	listRelationsByUser(userId: string) {
		return db.query.friend.findMany({
			where: or(eq(friend.userLowId, userId), eq(friend.userHighId, userId)),
		});
	},

	findUsersByIds(userIds: string[]) {
		if (userIds.length === 0) {
			return Promise.resolve([] as UserRecord[]);
		}

		return db.query.users.findMany({
			where: inArray(users.id, userIds),
		});
	},

	findUserById(userId: string) {
		return db.query.users.findFirst({
			where: eq(users.id, userId),
		});
	},

	findUserByEmail(email: string) {
		return db.query.users.findFirst({
			where: eq(users.email, email),
		});
	},

	findRelationByPair(userLowId: string, userHighId: string) {
		return db.query.friend.findFirst({
			where: and(eq(friend.userLowId, userLowId), eq(friend.userHighId, userHighId)),
		});
	},

	findPendingRelationById(friendId: string) {
		return db.query.friend.findFirst({
			where: and(eq(friend.id, friendId), eq(friend.status, "pending")),
		});
	},

	findRelationById(friendId: string) {
		return db.query.friend.findFirst({
			where: eq(friend.id, friendId),
		});
	},

	async createPendingRelation(input: {
		id: string;
		userLowId: string;
		userHighId: string;
		requestedByUserId: string;
		createdAt: Date;
	}) {
		await db.insert(friend).values({
			id: input.id,
			userLowId: input.userLowId,
			userHighId: input.userHighId,
			requestedByUserId: input.requestedByUserId,
			blockedByUserId: null,
			status: "pending",
			createdAt: input.createdAt,
		});
	},

	async markRelationAccepted(friendId: string) {
		await db
			.update(friend)
			.set({
				status: "accepted",
				blockedByUserId: null,
			})
			.where(eq(friend.id, friendId));
	},

	async deleteRelation(friendId: string) {
		await db.delete(friend).where(eq(friend.id, friendId));
	},

	searchUsers(currentUserId: string, searchPattern: string, limit: number) {
		return db.query.users.findMany({
			where: and(
				sql`${users.id} != ${currentUserId}`,
				or(like(users.email, searchPattern), like(users.name, searchPattern)),
			),
			limit,
		});
	},

	findRelationsForCandidates(currentUserId: string, candidateUserIds: string[]) {
		if (candidateUserIds.length === 0) {
			return Promise.resolve([] as FriendRecord[]);
		}

		return db.query.friend.findMany({
			where: and(
				or(eq(friend.userLowId, currentUserId), eq(friend.userHighId, currentUserId)),
				or(inArray(friend.userLowId, candidateUserIds), inArray(friend.userHighId, candidateUserIds)),
			),
		});
	},
};

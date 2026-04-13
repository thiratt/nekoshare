import { and, eq, inArray, like, or, sql } from "drizzle-orm";

import { db } from "@/infrastructure/db";
import { friend, users } from "@/infrastructure/db/schemas";

export type FriendRecord = typeof friend.$inferSelect;
export type UserRecord = typeof users.$inferSelect;

export const friendsRepository = {
	async listRelationsByUser(userId: string) {
		const [lowRelations, highRelations] = await Promise.all([
			db.query.friend.findMany({
				where: eq(friend.userLowId, userId),
			}),
			db.query.friend.findMany({
				where: eq(friend.userHighId, userId),
			}),
		]);

		return [...lowRelations, ...highRelations];
	},

	findUsersByIds(userIds: string[]) {
		const uniqueUserIds = Array.from(new Set(userIds));
		if (uniqueUserIds.length === 0) {
			return Promise.resolve([] as UserRecord[]);
		}

		return db.query.users.findMany({
			where: inArray(users.id, uniqueUserIds),
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

	async findRelationsForCandidates(currentUserId: string, candidateUserIds: string[]) {
		if (candidateUserIds.length === 0) {
			return Promise.resolve([] as FriendRecord[]);
		}

		const uniqueCandidateUserIds = Array.from(new Set(candidateUserIds));
		const [lowRelations, highRelations] = await Promise.all([
			db.query.friend.findMany({
				where: and(eq(friend.userLowId, currentUserId), inArray(friend.userHighId, uniqueCandidateUserIds)),
			}),
			db.query.friend.findMany({
				where: and(eq(friend.userHighId, currentUserId), inArray(friend.userLowId, uniqueCandidateUserIds)),
			}),
		]);

		return [...lowRelations, ...highRelations];
	},
};

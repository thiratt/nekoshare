import { randomUUID } from "node:crypto";
import type { ContentfulStatusCode } from "hono/utils/http-status";

import {
	getOtherUserId,
	getUserPair,
	isFriendParticipant,
	mapFriendToItem,
	mapSearchFriendStatus,
} from "./friends.mapper";
import type { FriendRecord, UserRecord } from "./friends.repository";
import type { FriendRequestInput } from "./friends.schema";

import type { User } from "@/modules/auth/lib";
import { HttpServiceError } from "@/shared/http";
import type { FriendListResponse, FriendStatus, UserSearchResponse } from "@/types/api";

export interface FriendsRepositoryPort {
	listRelationsByUser(userId: string): Promise<FriendRecord[]>;
	findUsersByIds(userIds: string[]): Promise<UserRecord[]>;
	findUserById(userId: string): Promise<UserRecord | undefined>;
	findUserByEmail(email: string): Promise<UserRecord | undefined>;
	findRelationByPair(userLowId: string, userHighId: string): Promise<FriendRecord | undefined>;
	findPendingRelationById(friendId: string): Promise<FriendRecord | undefined>;
	findRelationById(friendId: string): Promise<FriendRecord | undefined>;
	createPendingRelation(input: {
		id: string;
		userLowId: string;
		userHighId: string;
		requestedByUserId: string;
		createdAt: Date;
	}): Promise<void>;
	markRelationAccepted(friendId: string): Promise<void>;
	deleteRelation(friendId: string): Promise<void>;
	searchUsers(currentUserId: string, searchPattern: string, limit: number): Promise<UserRecord[]>;
	findRelationsForCandidates(currentUserId: string, candidateUserIds: string[]): Promise<FriendRecord[]>;
}

export interface FriendsEventsPort {
	isUserOnline(userId: string): Promise<boolean>;
	invalidateFriendGraphCache(userIds: string[]): Promise<void>;
	emitRequestReceived(
		targetUserId: string,
		payload: { friendId: string; user: FriendUserPayload; createdAt: string },
	): void;
	emitRequestAccepted(targetUserId: string, payload: { friendId: string; user: FriendUserPayload }): void;
	emitRequestRejected(targetUserId: string, payload: { friendId: string }): void;
	emitRequestCancelled(targetUserId: string, payload: { friendId: string }): void;
	emitFriendRemoved(targetUserId: string, payload: { friendId: string }): void;
}

type FriendUserPayload = {
	id: string;
	name: string;
	email: string;
	avatarUrl?: string;
};

export class FriendsServiceError extends HttpServiceError {
	constructor(code: string, status: ContentfulStatusCode, message: string) {
		super(code, status, message);
	}
}

export class FriendsService {
	constructor(
		private readonly repository: FriendsRepositoryPort,
		private readonly events: FriendsEventsPort,
	) {}

	private async invalidateFriendGraphCache(userIds: Array<string | null | undefined>): Promise<void> {
		const normalized = Array.from(
			new Set(
				userIds
					.map((userId) => userId?.trim())
					.filter((userId): userId is string => Boolean(userId)),
			),
		);
		if (normalized.length === 0) {
			return;
		}

		try {
			await this.events.invalidateFriendGraphCache(normalized);
		} catch {
			// ignore cache invalidation failures
		}
	}

	async list(currentUserId: string): Promise<FriendListResponse> {
		const relations = await this.repository.listRelationsByUser(currentUserId);

		if (relations.length === 0) {
			return {
				friends: [],
				incoming: [],
				outgoing: [],
				total: { friends: 0, incoming: 0, outgoing: 0 },
			};
		}

		const friendUserIds = relations
			.map((record) => getOtherUserId(record, currentUserId))
			.filter((id): id is string => !!id);
		const uniqueFriendUserIds = Array.from(new Set(friendUserIds));

		const friendUsers = await this.repository.findUsersByIds(friendUserIds);
		const userMap = new Map(friendUsers.map((user) => [user.id, user]));
		const onlineEntries = await Promise.all(
			uniqueFriendUserIds.map(async (friendUserId) => {
				const isOnline = await this.events.isUserOnline(friendUserId);
				return [friendUserId, isOnline] as const;
			}),
		);
		const onlineMap = new Map<string, boolean>(onlineEntries);

		const friends: FriendListResponse["friends"] = [];
		const incoming: FriendListResponse["incoming"] = [];
		const outgoing: FriendListResponse["outgoing"] = [];

		for (const relation of relations) {
			const otherUserId = getOtherUserId(relation, currentUserId);
			if (!otherUserId) {
				continue;
			}

			const item = mapFriendToItem(
				relation,
				currentUserId,
				userMap.get(otherUserId),
				onlineMap.get(otherUserId) ?? false,
			);
			if (!item) {
				continue;
			}

			if (item.status === "friend") {
				friends.push(item);
			} else if (item.status === "incoming") {
				incoming.push(item);
			} else if (item.status === "outgoing") {
				outgoing.push(item);
			}
		}

		const sortByName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);
		friends.sort(sortByName);
		incoming.sort(sortByName);
		outgoing.sort(sortByName);

		return {
			friends,
			incoming,
			outgoing,
			total: { friends: friends.length, incoming: incoming.length, outgoing: outgoing.length },
		};
	}

	async request(currentUser: User, input: FriendRequestInput) {
		const candidateEmail = input.email?.trim();

		let targetUser: UserRecord | undefined;
		if (input.userId) {
			targetUser = await this.repository.findUserById(input.userId);
		} else if (candidateEmail) {
			targetUser = await this.repository.findUserByEmail(candidateEmail);
		} else {
			throw new FriendsServiceError("VALIDATION_ERROR", 400, "userId or email is required");
		}

		if (!targetUser) {
			throw new FriendsServiceError("NOT_FOUND", 404, "User not found");
		}

		if (targetUser.id === currentUser.id) {
			throw new FriendsServiceError("VALIDATION_ERROR", 400, "Cannot add yourself as a friend");
		}

		const pair = getUserPair(currentUser.id, targetUser.id);
		const existingRelation = await this.repository.findRelationByPair(pair.userLowId, pair.userHighId);

		if (existingRelation) {
			if (existingRelation.status === "accepted") {
				throw new FriendsServiceError("ALREADY_EXISTS", 409, "Already friends");
			}

			if (existingRelation.status === "pending") {
				if (existingRelation.requestedByUserId === targetUser.id) {
					await this.repository.markRelationAccepted(existingRelation.id);
					await this.invalidateFriendGraphCache([currentUser.id, targetUser.id]);

					this.events.emitRequestAccepted(targetUser.id, {
						friendId: existingRelation.id,
						user: toFriendUserPayload(currentUser),
					});

					return {
						friendId: existingRelation.id,
						status: "friend" as FriendStatus,
						message: "Friend request accepted (mutual request)",
					};
				}

				throw new FriendsServiceError("ALREADY_EXISTS", 409, "Friend request already sent");
			}

			if (existingRelation.status === "blocked") {
				throw new FriendsServiceError("BLOCKED", 403, "Cannot send request to this user");
			}
		}

		const relationId = randomUUID();
		const createdAt = new Date();

		await this.repository.createPendingRelation({
			id: relationId,
			userLowId: pair.userLowId,
			userHighId: pair.userHighId,
			requestedByUserId: currentUser.id,
			createdAt,
		});
		await this.invalidateFriendGraphCache([currentUser.id, targetUser.id]);

		this.events.emitRequestReceived(targetUser.id, {
			friendId: relationId,
			user: toFriendUserPayload(currentUser),
			createdAt: createdAt.toISOString(),
		});

		return {
			friendId: relationId,
			status: "outgoing" as FriendStatus,
			user: {
				id: targetUser.id,
				name: targetUser.name,
				email: targetUser.email,
				avatarUrl: targetUser.image ?? undefined,
			},
		};
	}

	async accept(currentUser: User, friendId: string) {
		const existingRelation = await this.repository.findPendingRelationById(friendId);
		if (!existingRelation || !isFriendParticipant(existingRelation, currentUser.id)) {
			throw new FriendsServiceError("NOT_FOUND", 404, "Friend request not found");
		}

		if (existingRelation.requestedByUserId === currentUser.id) {
			throw new FriendsServiceError("VALIDATION_ERROR", 400, "Cannot accept your own outgoing request");
		}

		await this.repository.markRelationAccepted(friendId);
		await this.invalidateFriendGraphCache([currentUser.id, existingRelation.requestedByUserId]);
		this.events.emitRequestAccepted(existingRelation.requestedByUserId, {
			friendId,
			user: toFriendUserPayload(currentUser),
		});

		return {
			friendId,
			status: "friend" as FriendStatus,
		};
	}

	async reject(currentUser: User, friendId: string) {
		const existingRelation = await this.repository.findPendingRelationById(friendId);
		if (!existingRelation || !isFriendParticipant(existingRelation, currentUser.id)) {
			throw new FriendsServiceError("NOT_FOUND", 404, "Friend request not found");
		}

		if (existingRelation.requestedByUserId === currentUser.id) {
			throw new FriendsServiceError("VALIDATION_ERROR", 400, "Cannot reject your own outgoing request");
		}

		await this.repository.deleteRelation(friendId);
		await this.invalidateFriendGraphCache([currentUser.id, existingRelation.requestedByUserId]);
		this.events.emitRequestRejected(existingRelation.requestedByUserId, { friendId });

		return {
			friendId,
			status: "none" as FriendStatus,
		};
	}

	async cancel(currentUser: User, friendId: string) {
		const existingRelation = await this.repository.findPendingRelationById(friendId);
		if (!existingRelation || !isFriendParticipant(existingRelation, currentUser.id)) {
			throw new FriendsServiceError("NOT_FOUND", 404, "Friend request not found");
		}

		if (existingRelation.requestedByUserId !== currentUser.id) {
			throw new FriendsServiceError("VALIDATION_ERROR", 400, "Only requester can cancel this request");
		}

		const otherUserId = getOtherUserId(existingRelation, currentUser.id);
		await this.repository.deleteRelation(friendId);
		await this.invalidateFriendGraphCache([currentUser.id, otherUserId]);

		if (otherUserId) {
			this.events.emitRequestCancelled(otherUserId, { friendId });
		}

		return {
			friendId,
			status: "none" as FriendStatus,
		};
	}

	async remove(currentUser: User, friendId: string) {
		const existingRelation = await this.repository.findRelationById(friendId);
		if (!existingRelation || !isFriendParticipant(existingRelation, currentUser.id)) {
			throw new FriendsServiceError("NOT_FOUND", 404, "Friend not found");
		}

		await this.repository.deleteRelation(friendId);

		const otherUserId = getOtherUserId(existingRelation, currentUser.id);
		await this.invalidateFriendGraphCache([currentUser.id, otherUserId]);
		if (otherUserId) {
			this.events.emitFriendRemoved(otherUserId, { friendId });
		}

		return {
			friendId,
			status: "none" as FriendStatus,
		};
	}

	async search(currentUser: User, rawQuery: string): Promise<UserSearchResponse> {
		const query = rawQuery.trim();
		const searchPattern = `%${query}%`;

		const matchingUsers = await this.repository.searchUsers(currentUser.id, searchPattern, 10);
		if (matchingUsers.length === 0) {
			return {
				users: [],
				total: 0,
			};
		}

		const candidateUserIds = matchingUsers.map((user) => user.id);
		const relations = await this.repository.findRelationsForCandidates(currentUser.id, candidateUserIds);
		const relationByCandidate = new Map<string, FriendRecord>();

		for (const relation of relations) {
			const otherUserId = getOtherUserId(relation, currentUser.id);
			if (otherUserId) {
				relationByCandidate.set(otherUserId, relation);
			}
		}

		const users = matchingUsers.map((candidate) => ({
			id: candidate.id,
			name: candidate.name ?? "",
			email: candidate.email ?? "",
			avatarUrl: candidate.image ?? undefined,
			friendStatus: mapSearchFriendStatus(relationByCandidate.get(candidate.id), currentUser.id),
		}));

		return {
			users,
			total: users.length,
		};
	}
}

function toFriendUserPayload(user: User): FriendUserPayload {
	return {
		id: user.id,
		name: user.name ?? "Unknown",
		email: user.email ?? "",
		avatarUrl: user.image ?? undefined,
	};
}

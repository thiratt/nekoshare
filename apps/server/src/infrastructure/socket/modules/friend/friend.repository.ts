import { and, eq } from "drizzle-orm";

import { db } from "@/infrastructure/db";
import { friend } from "@/infrastructure/db/schemas";

const friendLinkColumns = {
	userLowId: true,
	userHighId: true,
} as const;

export const friendRepository = {
	async listAcceptedFriendLinks(userId: string) {
		const [lowLinks, highLinks] = await Promise.all([
			db.query.friend.findMany({
				where: and(eq(friend.userLowId, userId), eq(friend.status, "accepted")),
				columns: friendLinkColumns,
			}),
			db.query.friend.findMany({
				where: and(eq(friend.userHighId, userId), eq(friend.status, "accepted")),
				columns: friendLinkColumns,
			}),
		]);

		return [...lowLinks, ...highLinks];
	},
};

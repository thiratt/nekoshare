import { and, eq, or } from "drizzle-orm";

import { db } from "@/infrastructure/db";
import { friend } from "@/infrastructure/db/schemas";

export const friendRepository = {
	listAcceptedFriendLinks(userId: string) {
		return db.query.friend.findMany({
			where: and(or(eq(friend.userLowId, userId), eq(friend.userHighId, userId)), eq(friend.status, "accepted")),
			columns: {
				userLowId: true,
				userHighId: true,
			},
		});
	},
};

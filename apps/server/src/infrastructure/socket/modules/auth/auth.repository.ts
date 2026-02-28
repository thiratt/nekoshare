import { eq } from "drizzle-orm";

import { db } from "@/infrastructure/db";
import { verifications } from "@/infrastructure/db/schemas";

export const authSocketRepository = {
	findFirstDeviceByUserId(userId: string) {
		return db.query.device.findFirst({
			where: (devices) => eq(devices.userId, userId),
		});
	},

	revokeOneTimeToken(token: string) {
		const tokenFormat = `one-time-token:${token}`;
		return db.delete(verifications).where(eq(verifications.identifier, tokenFormat)).execute();
	},
};

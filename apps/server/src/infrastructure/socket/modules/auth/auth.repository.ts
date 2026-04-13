import { and, eq } from "drizzle-orm";

import { db } from "@/infrastructure/db";
import { verifications } from "@/infrastructure/db/schemas";

export const authSocketRepository = {
	findDeviceBySessionAndUser(sessionId: string, userId: string) {
		return db.query.device.findFirst({
			where: (devices) => and(eq(devices.currentSessionId, sessionId), eq(devices.userId, userId)),
		});
	},

	revokeOneTimeToken(token: string) {
		const tokenFormat = `one-time-token:${token}`;
		return db.delete(verifications).where(eq(verifications.identifier, tokenFormat)).execute();
	},
};

import { eq } from "drizzle-orm";

import { db } from "@/infrastructure/db";
import { device, users } from "@/infrastructure/db/schemas";

export const systemSocketRepository = {
	updateDeviceHeartbeatBySession(sessionId: string) {
		return db.update(device).set({ lastActiveAt: new Date() }).where(eq(device.currentSessionId, sessionId));
	},

	updateUserHeartbeat(userId: string) {
		return db.update(users).set({ updatedAt: new Date() }).where(eq(users.id, userId));
	},
};

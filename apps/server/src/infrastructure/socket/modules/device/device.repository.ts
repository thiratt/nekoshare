import { and, eq } from "drizzle-orm";

import { db } from "@/infrastructure/db";
import { device, sessions } from "@/infrastructure/db/schemas";

export const deviceRepository = {
	findOwnedDevice(deviceId: string, userId: string) {
		return db.query.device.findFirst({
			where: and(eq(device.id, deviceId), eq(device.userId, userId)),
		});
	},

	findBySessionId(sessionId: string) {
		return db.query.device.findFirst({
			where: eq(device.currentSessionId, sessionId),
		});
	},

	rename(deviceId: string, name: string) {
		return db.update(device).set({ deviceName: name }).where(eq(device.id, deviceId));
	},

	remove(deviceId: string) {
		return db.delete(device).where(eq(device.id, deviceId));
	},

	removeSession(sessionId: string) {
		return db.delete(sessions).where(eq(sessions.id, sessionId));
	},
};

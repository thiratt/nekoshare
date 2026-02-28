import { and, eq } from "drizzle-orm";

import { db } from "@/infrastructure/db";
import { device } from "@/infrastructure/db/schemas";

export type PeerDeviceRecord = typeof device.$inferSelect;

export const peerRepository = {
	findDeviceBySessionAndUser(sessionId: string, userId: string) {
		return db.query.device.findFirst({
			where: and(eq(device.currentSessionId, sessionId), eq(device.userId, userId)),
		});
	},

	findOwnedDeviceById(userId: string, targetDeviceId: string) {
		return db.query.device.findFirst({
			where: and(eq(device.userId, userId), eq(device.id, targetDeviceId)),
		});
	},

	findById(deviceId: string) {
		return db.query.device.findFirst({
			where: eq(device.id, deviceId),
		});
	},
};

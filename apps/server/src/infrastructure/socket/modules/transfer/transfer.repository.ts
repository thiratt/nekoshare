import { eq } from "drizzle-orm";

import { db } from "@/infrastructure/db";
import { device, users } from "@/infrastructure/db/schemas";

export const transferRepository = {
	findDeviceSessionById(deviceId: string) {
		return db.query.device.findFirst({
			where: eq(device.id, deviceId),
			columns: { id: true, currentSessionId: true },
		});
	},

	findDeviceIdBySessionId(sessionId: string) {
		return db.query.device.findFirst({
			where: eq(device.currentSessionId, sessionId),
			columns: { id: true },
		});
	},

	findSenderDevice(deviceId: string) {
		return db.query.device.findFirst({
			where: eq(device.id, deviceId),
			columns: { id: true, fingerprint: true, deviceName: true, userId: true },
		});
	},

	findUserSummary(userId: string) {
		return db.query.users.findFirst({
			where: eq(users.id, userId),
			columns: { id: true, name: true },
		});
	},

	findDeviceFingerprint(deviceId: string) {
		return db.query.device.findFirst({
			where: eq(device.id, deviceId),
			columns: { fingerprint: true },
		});
	},
};

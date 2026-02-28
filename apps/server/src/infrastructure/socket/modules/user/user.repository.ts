import { eq } from "drizzle-orm";

import { db } from "@/infrastructure/db";
import { device } from "@/infrastructure/db/schemas";

export const userSocketRepository = {
	updateDeviceInfoBySession(sessionId: string, values: { deviceName: string; lastActiveAt: Date }) {
		return db.update(device).set(values).where(eq(device.currentSessionId, sessionId));
	},
};

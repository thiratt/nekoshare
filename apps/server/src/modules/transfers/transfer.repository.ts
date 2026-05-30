import { eq } from "drizzle-orm";

import { db } from "@/infrastructure/db";
import { device } from "@/infrastructure/db/schemas";

export const transferHttpRepository = {
	async findDeviceIdBySessionId(sessionId: string): Promise<string | undefined> {
		const deviceInfo = await db.query.device.findFirst({
			where: eq(device.currentSessionId, sessionId),
			columns: { id: true },
		});
		return deviceInfo?.id;
	},
};

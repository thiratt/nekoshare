import { Hono } from "hono";
import { eq } from "drizzle-orm";

import type { AuthenticatedType } from "@/core/auth";
import { db } from "@/adapters/db";
import { success, type DeviceListResponse } from "@/types";

const app = new Hono<{ Variables: AuthenticatedType }>();

app.get("/", async (c) => {
	const user = c.get("user");

	const devices = await db.query.device.findMany({
		where: (devices) => eq(devices.userId, user.id),
	});

	return c.json(
		success<DeviceListResponse>({
			devices,
			total: devices.length,
		})
	);
});

export default app;

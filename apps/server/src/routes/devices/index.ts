import { Hono } from "hono";
import { eq, and } from "drizzle-orm";

import type { AuthenticatedType } from "@/core/auth";
import { db } from "@/adapters/db";
import { device } from "@/adapters/db/schemas";
import {
	success,
	error,
	type DeviceListResponse,
	type DeviceRegistrationRequest,
	type DeviceRegistrationResponse,
} from "@/types";

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

app.post("/register", async (c) => {
	const user = c.get("user");
	const body = await c.req.json<DeviceRegistrationRequest>();

	if (!body.id || !body.name || !body.platform || !body.publicKey) {
		return c.json(error("VALIDATION_ERROR", "Missing required fields"), 400);
	}

	const existingDevice = await db.query.device.findFirst({
		where: and(eq(device.id, body.id), eq(device.userId, user.id)),
	});

	if (existingDevice) {
		await db
			.update(device)
			.set({
				name: body.name,
				platform: body.platform,
				publicKey: body.publicKey,
				batterySupported: body.batterySupported,
				batteryCharging: body.batteryCharging,
				batteryPercent: body.batteryPercent,
				lastIp: body.lastIp,
				lastActiveAt: new Date(),
			})
			.where(eq(device.id, body.id));

		const updatedDevice = await db.query.device.findFirst({
			where: eq(device.id, body.id),
		});

		return c.json(
			success<DeviceRegistrationResponse>({
				device: updatedDevice!,
				isNew: false,
			})
		);
	}

	await db.insert(device).values({
		id: body.id,
		userId: user.id,
		name: body.name,
		platform: body.platform,
		publicKey: body.publicKey,
		batterySupported: body.batterySupported,
		batteryCharging: body.batteryCharging,
		batteryPercent: body.batteryPercent,
		lastIp: body.lastIp,
		lastActiveAt: new Date(),
	});

	const newDevice = await db.query.device.findFirst({
		where: eq(device.id, body.id),
	});

	return c.json(
		success<DeviceRegistrationResponse>({
			device: newDevice!,
			isNew: true,
		}),
		201
	);
});

export default app;

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
	const session = c.get("session");

	const devices = await db.query.device.findMany({
		where: (devices) => eq(devices.sessionId, session.id),
	});

	return c.json(
		success<DeviceListResponse>({
			devices,
			total: devices.length,
		})
	);
});

app.post("/register", async (c) => {
	const session = c.get("session");
	const body = await c.req.json<DeviceRegistrationRequest>();

	if (!body.id || !body.name || !body.platform || !body.publicKey) {
		return c.json(error("VALIDATION_ERROR", "Missing required fields"), 400);
	}

	const existingDevice = await db.query.device.findFirst({
		where: and(eq(device.id, body.id), eq(device.sessionId, session.id)),
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
		sessionId: session.id,
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

app.patch("/:id", async (c) => {
	const session = c.get("session");
	const deviceId = c.req.param("id");
	const body = await c.req.json<{ name?: string }>();

	const existingDevice = await db.query.device.findFirst({
		where: and(eq(device.id, deviceId), eq(device.sessionId, session.id)),
	});

	if (!existingDevice) {
		return c.json(error("NOT_FOUND", "Device not found"), 404);
	}

	await db
		.update(device)
		.set({
			...(body.name && { name: body.name }),
		})
		.where(eq(device.id, deviceId));

	const updatedDevice = await db.query.device.findFirst({
		where: eq(device.id, deviceId),
	});

	return c.json(success({ device: updatedDevice }));
});

app.delete("/:id", async (c) => {
	const session = c.get("session");
	const deviceId = c.req.param("id");

	const existingDevice = await db.query.device.findFirst({
		where: and(eq(device.id, deviceId), eq(device.sessionId, session.id)),
	});

	if (!existingDevice) {
		return c.json(error("NOT_FOUND", "Device not found"), 404);
	}

	await db.delete(device).where(eq(device.id, deviceId));

	return c.json(success({ deleted: true }));
});

export default app;

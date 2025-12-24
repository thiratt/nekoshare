import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

import type { AuthenticatedType } from "@/core/auth";
import { db } from "@/adapters/db";
import { device } from "@/adapters/db/schemas";
import {
	success,
	error,
	OS_TYPES,
	type Device,
	type DeviceListResponse,
	type DeviceRegistrationRequest,
	type DeviceRegistrationResponse,
} from "@/types";

const deviceRegistrationSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1).max(255),
	platform: z.object({
		os: z.enum(OS_TYPES),
		version: z.string(),
		long_version: z.string(),
	}),
	ip: z.object({
		ipv4: z.string().ip({ version: "v4" }),
		ipv6: z.string().ip({ version: "v6" }).nullable().optional(),
		is_tailscale: z.boolean(),
	}),
	battery: z.object({
		supported: z.boolean(),
		charging: z.boolean(),
		percent: z.number().min(0).max(100),
	}),
	publicKey: z.string().min(1),
});

const deviceUpdateSchema = z.object({
	name: z.string().min(1).max(255).optional(),
});

function mapDeviceToDto(d: typeof device.$inferSelect): Device {
	return {
		id: d.id,
		name: d.name,
		platform: {
			os: d.os,
			version: d.os_version,
			long_version: d.os_long_version,
		},
		ip: {
			ipv4: d.ipv4,
			ipv6: d.ipv6 || undefined,
			is_tailscale: d.is_tailscale,
		},
		battery: {
			supported: d.batterySupported,
			charging: d.batteryCharging,
			percent: d.batteryPercent,
		},
		lastActiveAt: d.lastActiveAt,
	};
}

function mapDeviceToDbValues(body: z.infer<typeof deviceRegistrationSchema>) {
	return {
		name: body.name,
		os: body.platform.os,
		os_version: body.platform.version,
		os_long_version: body.platform.long_version,
		publicKey: body.publicKey,
		batterySupported: body.battery.supported,
		batteryCharging: body.battery.charging,
		batteryPercent: body.battery.percent,
		ipv4: body.ip.ipv4,
		ipv6: body.ip.ipv6 || null,
		is_tailscale: body.ip.is_tailscale,
		lastActiveAt: new Date(),
	};
}

const app = new Hono<{ Variables: AuthenticatedType }>();

app.get("/", async (c) => {
	const session = c.get("session");

	const devices = await db.query.device.findMany({
		where: (devices) => eq(devices.sessionId, session.id),
	});

	return c.json(
		success<DeviceListResponse>({
			devices: devices.map(mapDeviceToDto),
			total: devices.length,
		})
	);
});

app.post("/register", async (c) => {
	const session = c.get("session");

	try {
		const rawBody = await c.req.json();
		const body = deviceRegistrationSchema.parse(rawBody);

		const existingDevice = await db.query.device.findFirst({
			where: and(eq(device.id, body.id), eq(device.sessionId, session.id)),
		});

		const dbValues = mapDeviceToDbValues(body);

		if (existingDevice) {
			await db.update(device).set(dbValues).where(eq(device.id, body.id));

			const updatedDevice = await db.query.device.findFirst({
				where: eq(device.id, body.id),
			});

			if (!updatedDevice) {
				return c.json(error("INTERNAL_ERROR", "Failed to retrieve updated device"), 500);
			}

			return c.json(
				success<DeviceRegistrationResponse>({
					device: mapDeviceToDto(updatedDevice),
					isNew: false,
				})
			);
		}

		await db.insert(device).values({
			id: body.id,
			sessionId: session.id,
			...dbValues,
		});

		const newDevice = await db.query.device.findFirst({
			where: eq(device.id, body.id),
		});

		if (!newDevice) {
			return c.json(error("INTERNAL_ERROR", "Failed to retrieve new device"), 500);
		}

		return c.json(
			success<DeviceRegistrationResponse>({
				device: mapDeviceToDto(newDevice),
				isNew: true,
			}),
			201
		);
	} catch (err) {
		if (err instanceof z.ZodError) {
			return c.json(
				error("VALIDATION_ERROR", err.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")),
				400
			);
		}
		throw err;
	}
});

app.patch("/:id", async (c) => {
	const session = c.get("session");
	const deviceId = c.req.param("id");

	try {
		const rawBody = await c.req.json();
		const body = deviceUpdateSchema.parse(rawBody);

		const existingDevice = await db.query.device.findFirst({
			where: and(eq(device.id, deviceId), eq(device.sessionId, session.id)),
		});

		if (!existingDevice) {
			return c.json(error("NOT_FOUND", "Device not found"), 404);
		}

		if (body.name) {
			await db.update(device).set({ name: body.name }).where(eq(device.id, deviceId));
		}

		const updatedDevice = await db.query.device.findFirst({
			where: eq(device.id, deviceId),
		});

		if (!updatedDevice) {
			return c.json(error("INTERNAL_ERROR", "Failed to retrieve updated device"), 500);
		}

		return c.json(success({ device: mapDeviceToDto(updatedDevice) }));
	} catch (err) {
		if (err instanceof z.ZodError) {
			return c.json(
				error("VALIDATION_ERROR", err.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")),
				400
			);
		}
		throw err;
	}
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

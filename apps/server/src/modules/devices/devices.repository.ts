import { and, eq } from "drizzle-orm";

import { db } from "@/infrastructure/db";
import { device } from "@/infrastructure/db/schemas";

export type DeviceRecord = typeof device.$inferSelect;

export const devicesRepository = {
	findByUserId(userId: string) {
		return db.query.device.findMany({
			where: (devices) => eq(devices.userId, userId),
		});
	},

	findByUserAndFingerprint(userId: string, fingerprint: string) {
		return db.query.device.findFirst({
			where: and(eq(device.userId, userId), eq(device.fingerprint, fingerprint)),
		});
	},

	findById(deviceId: string) {
		return db.query.device.findFirst({
			where: eq(device.id, deviceId),
		});
	},

	findByIdAndUser(deviceId: string, userId: string) {
		return db.query.device.findFirst({
			where: and(eq(device.id, deviceId), eq(device.userId, userId)),
		});
	},

	async updateById(
		deviceId: string,
		values: {
			deviceName?: string;
			platform?: "windows" | "android" | "web" | "other";
			fingerprint?: string | null;
			lastActiveAt?: Date;
			currentSessionId?: string;
		},
	) {
		await db.update(device).set(values).where(eq(device.id, deviceId));
	},

	async create(values: {
		id: string;
		userId: string;
		currentSessionId: string;
		deviceName: string;
		platform: "windows" | "android" | "web" | "other";
		fingerprint: string | null;
		lastActiveAt: Date;
	}) {
		await db.insert(device).values(values);
	},

	async deleteById(deviceId: string) {
		await db.delete(device).where(eq(device.id, deviceId));
	},
};

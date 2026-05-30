import { and, eq } from "drizzle-orm";

import { db } from "@/infrastructure/db";
import { device } from "@/infrastructure/db/schemas";

export interface DeviceIdentityRecord {
	id: string;
	userId: string;
	deviceName: string;
	fingerprint: string | null;
	revokedAt?: null;
}

const deviceIdentityColumns = {
	id: true,
	userId: true,
	deviceName: true,
	fingerprint: true,
} as const;

export const deviceIdentityRepository = {
	findDeviceById(deviceId: string): Promise<DeviceIdentityRecord | undefined> {
		return db.query.device.findFirst({
			where: eq(device.id, deviceId),
			columns: deviceIdentityColumns,
		});
	},

	findDeviceByIdAndUser(deviceId: string, userId: string): Promise<DeviceIdentityRecord | undefined> {
		return db.query.device.findFirst({
			where: and(eq(device.id, deviceId), eq(device.userId, userId)),
			columns: deviceIdentityColumns,
		});
	},

	findDeviceBySessionId(sessionId: string): Promise<DeviceIdentityRecord | undefined> {
		return db.query.device.findFirst({
			where: eq(device.currentSessionId, sessionId),
			columns: deviceIdentityColumns,
		});
	},
};

export type DeviceIdentityRepository = typeof deviceIdentityRepository;

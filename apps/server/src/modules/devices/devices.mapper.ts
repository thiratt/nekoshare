import type { DeviceRegistrationInput } from "./devices.schema";

import { device } from "@/infrastructure/db/schemas";
import type { Device } from "@/types/api";

export function mapDeviceToDto(record: typeof device.$inferSelect): Device {
	return {
		id: record.id,
		name: record.deviceName,
		platform: {
			os: record.platform,
		},
		fingerprint: record.fingerprint || undefined,
		lastActiveAt: record.lastActiveAt,
	};
}

export function mapRegistrationToDbValues(body: DeviceRegistrationInput) {
	return {
		deviceName: body.name,
		platform: body.platform.os,
		fingerprint: body.fingerprint || null,
		lastActiveAt: new Date(),
	};
}

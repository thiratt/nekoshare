import type { DeviceIdentityRecord, DeviceIdentityRepository } from "./device-identity.repository";

import { readCachedDeviceIdBySessionId } from "@/modules/auth/lib/utils";

export interface ResolvedDeviceIdentity {
	deviceId: string;
	userId: string;
	deviceName: string;
	fingerprint: string | null;
	revokedAt?: null;
}

export interface ResolveHttpDeviceInput {
	userId: string;
	sessionId: string;
	explicitDeviceId?: string;
}

export interface AssertDeviceBelongsToUserInput {
	userId: string;
	deviceId: string;
}

function toResolvedDeviceIdentity(record: DeviceIdentityRecord): ResolvedDeviceIdentity {
	return {
		deviceId: record.id,
		userId: record.userId,
		deviceName: record.deviceName,
		fingerprint: record.fingerprint,
		revokedAt: record.revokedAt,
	};
}

export class DeviceIdentityService {
	constructor(private readonly repository: DeviceIdentityRepository) {}

	async resolveHttpDevice(input: ResolveHttpDeviceInput): Promise<ResolvedDeviceIdentity | undefined> {
		const explicitDeviceId = input.explicitDeviceId?.trim();
		if (explicitDeviceId) {
			return this.assertDeviceBelongsToUser({
				deviceId: explicitDeviceId,
				userId: input.userId,
			});
		}

		const cachedDeviceId = await readCachedDeviceIdBySessionId(input.sessionId);
		if (cachedDeviceId !== undefined) {
			if (!cachedDeviceId) {
				return undefined;
			}

			return this.assertDeviceBelongsToUser({
				deviceId: cachedDeviceId,
				userId: input.userId,
			});
		}

		const device = await this.repository.findDeviceBySessionId(input.sessionId);
		if (!device || device.userId !== input.userId) {
			return undefined;
		}

		return toResolvedDeviceIdentity(device);
	}

	async assertDeviceBelongsToUser(
		input: AssertDeviceBelongsToUserInput,
	): Promise<ResolvedDeviceIdentity | undefined> {
		const device = await this.repository.findDeviceByIdAndUser(input.deviceId, input.userId);
		return device ? toResolvedDeviceIdentity(device) : undefined;
	}

	async findDeviceBySessionId(sessionId: string): Promise<ResolvedDeviceIdentity | undefined> {
		const device = await this.repository.findDeviceBySessionId(sessionId);
		return device ? toResolvedDeviceIdentity(device) : undefined;
	}
}

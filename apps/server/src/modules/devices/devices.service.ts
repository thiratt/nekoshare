import type { DeviceListResponse, DeviceRegistrationResponse } from "@/types/api";
import { HttpServiceError } from "@/shared/http";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { randomUUID } from "node:crypto";

import { mapDeviceToDto, mapRegistrationToDbValues } from "./devices.mapper";
import type { DeviceRegistrationInput, DeviceUpdateInput } from "./devices.schema";
import type { DeviceRecord } from "./devices.repository";

type SessionInfo = {
	id: string;
	userId: string;
};

type MySqlErrorLike = {
	code?: string;
};

export type DeviceAddedPayload = ReturnType<typeof mapDeviceToDto>;

export interface DevicesRepositoryPort {
	findByUserId(userId: string): Promise<DeviceRecord[]>;
	findByUserAndFingerprint(userId: string, fingerprint: string): Promise<DeviceRecord | undefined>;
	findById(deviceId: string): Promise<DeviceRecord | undefined>;
	findByIdAndUser(deviceId: string, userId: string): Promise<DeviceRecord | undefined>;
	updateById(
		deviceId: string,
		values: {
			deviceName?: string;
			platform?: "windows" | "android" | "web" | "other";
			fingerprint?: string | null;
			lastActiveAt?: Date;
			currentSessionId?: string;
		},
	): Promise<void>;
	create(values: {
		id: string;
		userId: string;
		currentSessionId: string;
		deviceName: string;
		platform: "windows" | "android" | "web" | "other";
		fingerprint: string | null;
		lastActiveAt: Date;
	}): Promise<void>;
	deleteById(deviceId: string): Promise<void>;
}

export interface DevicesEventsPort {
	emitDeviceAdded(userId: string, dto: DeviceAddedPayload): void;
}

export class DevicesServiceError extends HttpServiceError {
	constructor(code: string, status: ContentfulStatusCode, message: string) {
		super(code, status, message);
	}
}

export class DevicesService {
	constructor(
		private readonly repository: DevicesRepositoryPort,
		private readonly events: DevicesEventsPort,
	) {}

	async list(session: SessionInfo): Promise<DeviceListResponse> {
		const devices = await this.repository.findByUserId(session.userId);

		return {
			devices: devices.map(mapDeviceToDto),
			total: devices.length,
		};
	}

	async register(session: SessionInfo, body: DeviceRegistrationInput): Promise<DeviceRegistrationResponse> {
		const machineId = body.id.trim();
		const dbValues = mapRegistrationToDbValues(body);

		let existingDevice: DeviceRecord | undefined;

		if (body.fingerprint) {
			existingDevice = await this.repository.findByUserAndFingerprint(session.userId, body.fingerprint);
		}

		if (!existingDevice) {
			// Backward compatibility for old rows that used machine id as primary key.
			existingDevice = await this.repository.findByIdAndUser(machineId, session.userId);
		}

		if (existingDevice) {
			await this.repository.updateById(existingDevice.id, {
				...dbValues,
				currentSessionId: session.id,
			});

			const updatedDevice = await this.repository.findById(existingDevice.id);
			if (!updatedDevice) {
				throw new DevicesServiceError("INTERNAL_ERROR", 500, "Failed to retrieve updated device");
			}

			return {
				device: mapDeviceToDto(updatedDevice),
				isNew: false,
			};
		}

		const newDeviceId = randomUUID();
		try {
			await this.repository.create({
				id: newDeviceId,
				userId: session.userId,
				currentSessionId: session.id,
				...dbValues,
			});
		} catch (error) {
			if (body.fingerprint && isDuplicateKeyError(error)) {
				const existingByFingerprint = await this.repository.findByUserAndFingerprint(
					session.userId,
					body.fingerprint,
				);
				if (existingByFingerprint) {
					await this.repository.updateById(existingByFingerprint.id, {
						...dbValues,
						currentSessionId: session.id,
					});

					const updatedDevice = await this.repository.findById(existingByFingerprint.id);
					if (!updatedDevice) {
						throw new DevicesServiceError("INTERNAL_ERROR", 500, "Failed to retrieve updated device");
					}

					return {
						device: mapDeviceToDto(updatedDevice),
						isNew: false,
					};
				}
			}

			throw error;
		}

		const newDevice = await this.repository.findById(newDeviceId);
		if (!newDevice) {
			throw new DevicesServiceError("INTERNAL_ERROR", 500, "Failed to retrieve new device");
		}

		const dto = mapDeviceToDto(newDevice);
		this.events.emitDeviceAdded(session.userId, dto);

		return {
			device: dto,
			isNew: true,
		};
	}

	async update(session: SessionInfo, deviceId: string, body: DeviceUpdateInput) {
		const existingDevice = await this.repository.findByIdAndUser(deviceId, session.userId);
		if (!existingDevice) {
			throw new DevicesServiceError("NOT_FOUND", 404, "Device not found");
		}

		if (body.name) {
			await this.repository.updateById(deviceId, { deviceName: body.name });
		}

		const updatedDevice = await this.repository.findById(deviceId);
		if (!updatedDevice) {
			throw new DevicesServiceError("INTERNAL_ERROR", 500, "Failed to retrieve updated device");
		}

		return {
			device: mapDeviceToDto(updatedDevice),
		};
	}

	async remove(session: SessionInfo, deviceId: string) {
		const existingDevice = await this.repository.findByIdAndUser(deviceId, session.userId);
		if (!existingDevice) {
			throw new DevicesServiceError("NOT_FOUND", 404, "Device not found");
		}

		await this.repository.deleteById(deviceId);

		return {
			deleted: true,
		};
	}
}

function isDuplicateKeyError(error: unknown): boolean {
	if (!error || typeof error !== "object") {
		return false;
	}

	return (error as MySqlErrorLike).code === "ER_DUP_ENTRY";
}

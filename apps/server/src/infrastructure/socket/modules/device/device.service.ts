import { Logger } from "@/infrastructure/logger";
import type { IConnection, TransportType } from "@/infrastructure/socket/runtime/types";

import { broadcastDeviceRemoved, broadcastDeviceUpdated } from "./device.gateway";
import { deviceRepository } from "./device.repository";
import type { DeviceDeletePayload, DeviceRenamePayload } from "./device.types";

export async function processDeviceRename(
	client: IConnection,
	transportType: TransportType,
	payload: DeviceRenamePayload,
): Promise<void> {
	const userId = client.user?.id;
	if (!userId) {
		throw new Error("Unauthorized");
	}

	const existingDevice = await deviceRepository.findOwnedDevice(payload.id, userId);
	if (!existingDevice) {
		throw new Error("Device not found");
	}

	await deviceRepository.rename(payload.id, payload.name);
	broadcastDeviceUpdated(userId, { id: payload.id, name: payload.name });

	Logger.debug(transportType, `Device renamed: ${payload.id} -> ${payload.name}`);
}

export async function processDeviceDelete(
	client: IConnection,
	transportType: TransportType,
	payload: DeviceDeletePayload,
): Promise<void> {
	const userId = client.user?.id;
	if (!userId) {
		throw new Error("Unauthorized");
	}

	const existingDevice = await deviceRepository.findOwnedDevice(payload.id, userId);
	if (!existingDevice) {
		throw new Error("Device not found");
	}

	await deviceRepository.remove(payload.id);

	if (existingDevice.currentSessionId) {
		await deviceRepository.removeSession(existingDevice.currentSessionId);
	}

	let actorDeviceName = "Unknown Device";
	if (client.session?.id) {
		const actorDevice = await deviceRepository.findBySessionId(client.session.id);
		if (actorDevice) {
			actorDeviceName = actorDevice.deviceName;
		}
	}

	broadcastDeviceRemoved(userId, {
		id: payload.id,
		fingerprint: existingDevice.fingerprint || null,
		terminatedBy: actorDeviceName,
	});

	Logger.debug(
		transportType,
		`Device deleted: ${payload.id}, Session terminated: ${existingDevice.currentSessionId}`,
	);
}

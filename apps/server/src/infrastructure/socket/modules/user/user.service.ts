import { Logger } from "@/infrastructure/logger";

import type { IConnection, TransportType } from "@/infrastructure/socket/runtime/types";
import { userSocketRepository } from "./user.repository";
import type { UserDeviceUpdatePayload } from "./user.types";

export async function processUserDeviceUpdate(
	client: IConnection,
	transportType: TransportType,
	payload: UserDeviceUpdatePayload,
): Promise<void> {
	const deviceName = payload.deviceName?.trim();
	if (!deviceName) {
		throw new Error("Invalid payload: deviceName is required");
	}

	if (!client.session?.id) {
		throw new Error("Unauthorized");
	}

	await userSocketRepository.updateDeviceInfoBySession(client.session.id, {
		deviceName,
		lastActiveAt: new Date(),
	});

	Logger.debug(transportType, `Device info updated for user ${client.id}: ${deviceName}`);
}

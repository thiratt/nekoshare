import { systemSocketRepository } from "./system.repository";
import type { HeartbeatConnection } from "./system.types";

export async function processHeartbeat(client: HeartbeatConnection): Promise<void> {
	if (client.user?.id) {
		if (client.session?.id) {
			await systemSocketRepository.updateDeviceHeartbeatBySession(client.session.id);
		}

		await systemSocketRepository.updateUserHeartbeat(client.user.id);
	}
}

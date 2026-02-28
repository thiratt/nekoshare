import { PacketType } from "@workspace/contracts/ws";

import { wsSessionManager } from "@/infrastructure/socket/transport/ws/connection";

export function broadcastDeviceUpdated(userId: string, payload: { id: string; name: string }): void {
	const userSessions = wsSessionManager.getSessionsByUserId(userId);
	const broadcastPayload = JSON.stringify(payload);

	for (const session of userSessions) {
		session.sendPacket(PacketType.DEVICE_UPDATED, (writer) => writer.writeString(broadcastPayload));
	}
}

export function broadcastDeviceRemoved(
	userId: string,
	payload: { id: string; fingerprint: string | null; terminatedBy: string },
): void {
	const userSessions = wsSessionManager.getSessionsByUserId(userId);
	const broadcastPayload = JSON.stringify(payload);

	for (const session of userSessions) {
		session.sendPacket(PacketType.DEVICE_REMOVED, (writer) => writer.writeString(broadcastPayload));
	}
}

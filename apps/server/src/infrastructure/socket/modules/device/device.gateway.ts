import { sendJsonToSessions } from "@/infrastructure/socket/modules/friend/friend.gateway";
import { PacketType } from "@workspace/contracts/ws";

export function broadcastDeviceUpdated(userId: string, payload: { id: string; name: string }): void {
	const broadcastPayload = JSON.stringify(payload);
	sendJsonToSessions(userId, PacketType.DEVICE_UPDATED, broadcastPayload);
}

export function broadcastDeviceRemoved(
	userId: string,
	payload: { id: string; fingerprint: string | null; terminatedBy: string },
): void {
	const broadcastPayload = JSON.stringify(payload);
	sendJsonToSessions(userId, PacketType.DEVICE_REMOVED, broadcastPayload);
}

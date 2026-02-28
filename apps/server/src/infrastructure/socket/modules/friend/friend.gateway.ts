import { PacketType } from "@workspace/contracts/ws";

import { wsSessionManager } from "@/infrastructure/socket/transport/ws/connection";

export function getUserSessions(userId: string) {
	return wsSessionManager.getSessionsByUserId(userId);
}

export function sendJsonToSessions(
	userId: string,
	packetType: PacketType,
	payloadJson: string,
	options?: { excludeConnectionId?: string },
): number {
	const sessions = wsSessionManager.getSessionsByUserId(userId);
	let sent = 0;

	for (const session of sessions) {
		if (options?.excludeConnectionId && session.id === options.excludeConnectionId) {
			continue;
		}
		session.sendPacket(packetType, (writer) => writer.writeString(payloadJson));
		sent++;
	}

	return sent;
}

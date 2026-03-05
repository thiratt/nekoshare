import { publishWsUserEvent } from "@/infrastructure/socket/events/ws-pubsub";
import { PacketType } from "@/infrastructure/socket/protocol/packet-type";
import { wsSessionManager } from "@/infrastructure/socket/transport/ws/connection";

export function getUserSessions(userId: string) {
	return wsSessionManager.getSessionsByUserId(userId);
}

function sendJsonToSessionsLocal(
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

export function sendJsonToSessions(
	userId: string,
	packetType: PacketType,
	payloadJson: string,
	options?: { excludeConnectionId?: string },
): number {
	const sent = sendJsonToSessionsLocal(userId, packetType, payloadJson, options);

	void publishWsUserEvent({
		targetUserId: userId,
		packetType,
		payloadJson,
		excludeConnectionId: options?.excludeConnectionId,
	});

	return sent;
}

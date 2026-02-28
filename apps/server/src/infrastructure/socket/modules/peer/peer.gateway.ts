import { wsSessionManager } from "@/infrastructure/socket/transport/ws/connection";
import { tcpSessionManager } from "@/infrastructure/socket/transport/tcp/connection";
import { PacketType } from "@workspace/contracts/ws";

import type { IConnection } from "@/infrastructure/socket/runtime/types";
import type { PeerTransport } from "./peer.types";

export function getConnectionIp(conn: IConnection): string {
	const wsAddress = (conn as { remoteAddress?: string | null }).remoteAddress;
	if (wsAddress) {
		return wsAddress;
	}

	const tcpAddress = (conn as { socket?: { remoteAddress?: string | null } }).socket?.remoteAddress;
	if (tcpAddress) {
		return tcpAddress;
	}

	return "0.0.0.0";
}

export function findConnectionByDeviceSession(deviceSessionId: string | null): IConnection | undefined {
	if (!deviceSessionId) {
		return undefined;
	}

	for (const session of wsSessionManager.getAllSessions()) {
		if (session.session?.id === deviceSessionId) {
			return session;
		}
	}

	for (const session of tcpSessionManager.getAllSessions()) {
		if (session.session?.id === deviceSessionId) {
			return session;
		}
	}

	return undefined;
}

export function getConnection(connectionId: string, transport: PeerTransport): IConnection | undefined {
	if (transport === "WebSocket") {
		return wsSessionManager.getSession(connectionId);
	}

	return tcpSessionManager.getSession(connectionId);
}

export function sendJsonPacket<T extends IConnection>(
	client: T,
	packetType: PacketType,
	payload: object,
	requestId?: number,
): void {
	client.sendPacket(
		packetType,
		(writer) => {
			writer.writeString(JSON.stringify(payload));
		},
		requestId,
	);
}

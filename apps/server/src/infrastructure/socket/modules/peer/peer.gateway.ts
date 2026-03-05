import type { ConnectionTarget } from "@/infrastructure/socket/routing";
import { resolveConnectionTargetByDeviceId, resolveConnectionTargetBySessionId } from "@/infrastructure/socket/routing";
import { PacketType } from "@workspace/contracts/ws";

import type { IConnection } from "@/infrastructure/socket/runtime/types";

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

export async function findConnectionTargetByDeviceSession(
	deviceSessionId: string | null,
): Promise<ConnectionTarget | undefined> {
	return resolveConnectionTargetBySessionId(deviceSessionId);
}

export async function findConnectionTargetByDeviceId(deviceId: string | null): Promise<ConnectionTarget | undefined> {
	return resolveConnectionTargetByDeviceId(deviceId);
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

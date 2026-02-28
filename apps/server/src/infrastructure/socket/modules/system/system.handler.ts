import { Logger } from "@/infrastructure/logger";
import { PacketType } from "@workspace/contracts/ws";

import { PacketRouter } from "@/infrastructure/socket/runtime/packet-router";
import type { CommandHandler, IConnection, TransportType } from "@/infrastructure/socket/runtime/types";
import { processHeartbeat } from "./system.service";

function sendError(client: IConnection, requestId: number, message: string): void {
	client.sendPacket(
		PacketType.ERROR_GENERIC,
		(writer) => {
			writer.writeString(message);
		},
		requestId,
	);
}

export function registerSystemHandlers<T extends IConnection>(router: PacketRouter<T>, transportType: TransportType) {
	const handleHeartbeat: CommandHandler<T> = async (client, reader, requestId) => {
		try {
			// Drain optional heartbeat payload from older clients.
			if (!reader.isEnd()) {
				reader.readString();
			}

			await processHeartbeat(client);
			client.sendPacket(PacketType.SYSTEM_HEARTBEAT, 0);
		} catch (error) {
			const msg = (error as Error).message;
			Logger.error(transportType, `Failed to handle heartbeat for user ${client.id}: ${msg}`);
			sendError(client, requestId, `Heartbeat failed: ${msg}`);
		}
	};

	router.register(PacketType.SYSTEM_HEARTBEAT, handleHeartbeat);
	Logger.debug(transportType, "SystemController handlers registered");
}

import type { IConnection, CommandHandler, TransportType } from "../types";
import type { BinaryReader } from "../binary-utils";
import type { PacketRouter } from "../router";
import { PacketType } from "../protocol";
import { Logger } from "@/core/logger";

export function registerSystemHandlers<T extends IConnection>(router: PacketRouter<T>, transportType: TransportType) {
	const handleHeartbeat: CommandHandler<T> = async (client, reader, requestId) => {
		try {
			client.sendPacket(PacketType.SYSTEM_HEARTBEAT, 0);
		} catch (error) {
			const msg = (error as Error).message;
			Logger.error(transportType, `Failed to handle heartbeat for user ${client.id}: ${msg}`);
			client.sendPacket(
				PacketType.ERROR_GENERIC,
				(w) => {
					w.writeString("Heartbeat failed: " + msg);
				},
				requestId
			);
		}
	};

	router.register(PacketType.SYSTEM_HEARTBEAT, handleHeartbeat);
	Logger.debug(transportType, "SystemController handlers registered");
}

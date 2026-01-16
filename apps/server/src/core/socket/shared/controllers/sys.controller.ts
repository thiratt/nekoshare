import type { IConnection, CommandHandler, TransportType } from "../types";
import type { PacketRouter } from "../router";
import { PacketType } from "../protocol";
import { Logger } from "@/core/logger";

import { db } from "@/adapters/db";
import { device } from "@/adapters/db/schemas";
import { eq } from "drizzle-orm";

export function registerSystemHandlers<T extends IConnection>(router: PacketRouter<T>, transportType: TransportType) {
	const handleHeartbeat: CommandHandler<T> = async (client, reader, requestId) => {
		try {
			if (client.user?.id) {
				if (client.session?.id) {
					await db
						.update(device)
						.set({ lastActiveAt: new Date() })
						.where(eq(device.sessionId, client.session.id));
				}
			}

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

import type { IConnection, CommandHandler, TransportType } from "../types";
import type { PacketRouter } from "../router";
import { PacketType } from "../protocol";
import { Logger } from "@/core/logger";
import { safeJsonParse } from "@/core/utils/json-helper";

import { db } from "@/adapters/db";
import { device } from "@/adapters/db/schemas";
import { eq } from "drizzle-orm";

interface HeartbeatPayload {
	battery: {
		supported: boolean;
		charging: boolean;
		percent: number;
	};
	ip: {
		ipv4: string;
		ipv6: string | null;
	};
}

export function registerSystemHandlers<T extends IConnection>(router: PacketRouter<T>, transportType: TransportType) {
	const handleHeartbeat: CommandHandler<T> = async (client, reader, requestId) => {
		try {
			if (client.user?.id) {
				if (client.session?.id) {
					let updateData: {
						lastActiveAt: Date;
						batterySupported?: boolean;
						batteryCharging?: boolean;
						batteryPercent?: number;
						ipv4?: string;
						ipv6?: string | null;
					} = { lastActiveAt: new Date() };

					try {
						if (!reader.isEnd()) {
							const rawData = reader.readString();
							const { data } = safeJsonParse<HeartbeatPayload>(rawData);

							if (data) {
								updateData.batterySupported = data.battery.supported;
								updateData.batteryCharging = data.battery.charging;
								updateData.batteryPercent = data.battery.percent;
								updateData.ipv4 = data.ip.ipv4;
								updateData.ipv6 = data.ip.ipv6 || null;
							}
						}
					} catch {}

					await db.update(device).set(updateData).where(eq(device.sessionId, client.session.id));
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
				requestId,
			);
		}
	};

	router.register(PacketType.SYSTEM_HEARTBEAT, handleHeartbeat);
	Logger.debug(transportType, "SystemController handlers registered");
}

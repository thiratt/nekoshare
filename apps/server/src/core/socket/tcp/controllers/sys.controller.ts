import { Connection } from "../connection";
import { BinaryReader } from "../binary-utils";
import { mainRouter } from "../router";
import { PacketType } from "../protocol";
import { Logger } from "@/core/logger";

export class SystemController {
	static init() {
		mainRouter.register(PacketType.SYSTEM_HEARTBEAT, SystemController.handleHeartbeat);
	}

	private static async handleHeartbeat(client: Connection, reader: BinaryReader, requestId: number) {
		try {
			client.sendPacket(PacketType.SYSTEM_HEARTBEAT, 0);
		} catch (error) {
			const msg = (error as Error).message;
			Logger.error("TCP", `Failed to handle heartbeat for user ${client.id}: ${(error as Error).message}`);
			client.sendPacket(
				PacketType.ERROR_GENERIC,
				(w) => {
					w.writeString("Heartbeat failed: " + msg);
				},
				requestId
			);
		}
	}
}

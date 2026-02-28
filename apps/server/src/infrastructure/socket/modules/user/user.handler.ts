import { Logger } from "@/infrastructure/logger";
import { safeJsonParse } from "@/shared/utils/json-helper";
import { PacketType } from "@workspace/contracts/ws";

import { PacketRouter } from "@/infrastructure/socket/runtime/packet-router";
import type { CommandHandler, IConnection, TransportType } from "@/infrastructure/socket/runtime/types";
import { processUserDeviceUpdate } from "./user.service";
import type { UserDeviceUpdatePayload } from "./user.types";

function sendError(client: IConnection, requestId: number, message: string): void {
	client.sendPacket(
		PacketType.ERROR_GENERIC,
		(writer) => {
			writer.writeString(message);
		},
		requestId,
	);
}

export function registerUserHandlers<T extends IConnection>(router: PacketRouter<T>, transportType: TransportType) {
	const handleUpdateDeviceInfo: CommandHandler<T> = async (client, reader, requestId) => {
		try {
			const rawData = reader.readString();
			const { data, error } = safeJsonParse<UserDeviceUpdatePayload>(rawData);
			if (error || !data) {
				throw new Error("Invalid JSON data");
			}

			await processUserDeviceUpdate(client, transportType, data);
		} catch (error) {
			const msg = (error as Error).message;
			Logger.error(transportType, `Failed to update device info for user ${client.id}: ${msg}`);
			sendError(client, requestId, `Update failed: ${msg}`);
		}
	};

	router.register(PacketType.USER_UPDATE_DEVICE, handleUpdateDeviceInfo);
	Logger.debug(transportType, "UserController handlers registered");
}

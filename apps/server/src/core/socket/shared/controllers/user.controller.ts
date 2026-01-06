import type { IConnection, CommandHandler, TransportType, UserDeviceInfoPacket } from "../types";
import type { PacketRouter } from "../router";
import { PacketType } from "../protocol";
import { Logger } from "@/core/logger";
import { safeJsonParse } from "@/core/utils/json-helper";

export function registerUserHandlers<T extends IConnection>(router: PacketRouter<T>, transportType: TransportType) {
	const handleUpdateDeviceInfo: CommandHandler<T> = async (client, reader, requestId) => {
		try {
			const rawData = reader.readString();
			const { data, error } = safeJsonParse<UserDeviceInfoPacket>(rawData);
			if (error || !data) {
				throw new Error("Invalid JSON data");
			}

			// TODO: Update the user's device info in the database
			Logger.debug(transportType, `Device info updated for user ${client.id}: ${data.deviceName}`);
		} catch (error) {
			const msg = (error as Error).message;
			Logger.error(transportType, `Failed to update device info for user ${client.id}: ${msg}`);
			client.sendPacket(
				PacketType.ERROR_GENERIC,
				(w) => {
					w.writeString("Update failed: " + msg);
				},
				requestId
			);
		}
	};

	router.register(PacketType.USER_UPDATE_DEVICE, handleUpdateDeviceInfo);
	Logger.debug(transportType, "UserController handlers registered");
}

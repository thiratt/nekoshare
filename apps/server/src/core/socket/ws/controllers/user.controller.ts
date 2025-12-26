import { Connection } from "../connection";
import { BinaryReader } from "../binary-utils";
import { mainRouter } from "../router";
import { PacketType } from "../protocol";
import { Logger } from "@/core/logger";
import { safeJsonParse } from "@/core/utils/json-helper";

interface UserDeviceInfoPacket {
	deviceName: string;
	ip: {
		type: "IPv4" | "IPv6";
		address: string;
	};
	batteryLevel: number;
}

export class UserController {
	static init() {
		mainRouter.register(PacketType.USER_UPDATE_DEVICE, UserController.handleUpdateDeviceInfo);
	}

	private static async handleUpdateDeviceInfo(client: Connection, reader: BinaryReader, requestId: number) {
		try {
			const rawData = reader.readString();
			const { data, error } = safeJsonParse<UserDeviceInfoPacket>(rawData);
			if (error || !data) {
				throw new Error("Invalid JSON data");
			}

			// TODO: Update the user's device info in the database
		} catch (error) {
			const msg = (error as Error).message;
			Logger.error(
				"WebSocket",
				`Failed to update device info for user ${client.id}: ${(error as Error).message}`
			);
			client.sendPacket(
				PacketType.ERROR_GENERIC,
				(w) => {
					w.writeString("Update failed: " + msg);
				},
				requestId
			);
		}
	}
}

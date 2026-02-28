import { Logger } from "@/infrastructure/logger";
import { safeJsonParse } from "@/shared/utils/json-helper";
import { PacketType } from "@workspace/contracts/ws";

import { PacketRouter } from "@/infrastructure/socket/runtime/packet-router";
import type { CommandHandler, IConnection, TransportType } from "@/infrastructure/socket/runtime/types";
import type { DeviceDeletePayload, DeviceRenamePayload } from "./device.types";
import { processDeviceDelete, processDeviceRename } from "./device.service";

function sendError(client: IConnection, requestId: number, message: string): void {
	const errorPayload = JSON.stringify({ message });
	client.sendPacket(PacketType.ERROR_GENERIC, (writer) => writer.writeString(errorPayload), requestId);
}

export function registerDeviceHandlers<T extends IConnection>(router: PacketRouter<T>, transportType: TransportType) {
	const handleDeviceRename: CommandHandler<T> = async (client, reader, requestId) => {
		try {
			const rawData = reader.readString();
			const { data, error } = safeJsonParse<DeviceRenamePayload>(rawData);

			if (error || !data?.id || !data?.name) {
				throw new Error("Invalid payload");
			}

			await processDeviceRename(client, transportType, data);
		} catch (error) {
			const msg = (error as Error).message;
			Logger.error(transportType, `Failed to rename device: ${msg}`);
			sendError(client, requestId, `Rename failed: ${msg}`);
		}
	};

	const handleDeviceDelete: CommandHandler<T> = async (client, reader, requestId) => {
		try {
			const rawData = reader.readString();
			const { data, error } = safeJsonParse<DeviceDeletePayload>(rawData);

			if (error || !data?.id) {
				throw new Error("Invalid payload");
			}

			await processDeviceDelete(client, transportType, data);
		} catch (error) {
			const msg = (error as Error).message;
			Logger.error(transportType, `Failed to delete device: ${msg}`);
			sendError(client, requestId, `Delete failed: ${msg}`);
		}
	};

	router.register(PacketType.DEVICE_RENAME, handleDeviceRename);
	router.register(PacketType.DEVICE_DELETE, handleDeviceDelete);
}

import { db } from "@/adapters/db";
import { device, session as sessionSchema } from "@/adapters/db/schemas";
import { Logger } from "@/core/logger";
import { safeJsonParse } from "@/core/utils/json-helper";
import { and, eq } from "drizzle-orm";
import { wsSessionManager } from "../../ws/connection";
import { PacketType } from "../protocol";
import type { CommandHandler, IConnection, TransportType } from "../types";
import { PacketRouter } from "../router";

export function registerDeviceHandlers<T extends IConnection>(router: PacketRouter<T>, transportType: TransportType) {
	const handleDeviceRename: CommandHandler<T> = async (client, reader, requestId) => {
		try {
			const rawData = reader.readString();
			const { data, error } = safeJsonParse<{ id: string; name: string }>(rawData);

			if (error || !data || !data.id || !data.name) {
				throw new Error("Invalid payload");
			}

			const userId = client.user?.id;
			if (!userId) throw new Error("Unauthorized");

			const existingDevice = await db.query.device.findFirst({
				where: and(eq(device.id, data.id), eq(device.userId, userId)),
			});

			if (!existingDevice) {
				throw new Error("Device not found");
			}

			await db.update(device).set({ name: data.name }).where(eq(device.id, data.id));

			const userSessions = wsSessionManager.getSessionsByUserId(userId);
			const broadcastPayload = JSON.stringify({
				id: data.id,
				name: data.name,
			});

			for (const session of userSessions) {
				session.sendPacket(PacketType.DEVICE_UPDATED, (w) => w.writeString(broadcastPayload));
			}

			Logger.debug(transportType, `Device renamed: ${data.id} -> ${data.name}`);
		} catch (error) {
			const msg = (error as Error).message;
			Logger.error(transportType, `Failed to rename device: ${msg}`);
			client.sendPacket(PacketType.ERROR_GENERIC, (w) => w.writeString("Rename failed: " + msg), requestId);
		}
	};

	const handleDeviceDelete: CommandHandler<T> = async (client, reader, requestId) => {
		try {
			const rawData = reader.readString();
			const { data, error } = safeJsonParse<{ id: string }>(rawData);

			if (error || !data || !data.id) {
				throw new Error("Invalid payload");
			}

			const userId = client.user?.id;
			if (!userId) throw new Error("Unauthorized");

			const existingDevice = await db.query.device.findFirst({
				where: and(eq(device.id, data.id), eq(device.userId, userId)),
			});

			if (!existingDevice) {
				throw new Error("Device not found");
			}

			await db.delete(device).where(eq(device.id, data.id));

			if (existingDevice.sessionId) {
				await db.delete(sessionSchema).where(eq(sessionSchema.id, existingDevice.sessionId));
			}

			let actorDeviceName = "Unknown Device";
			if (client.session?.id) {
				const actorDevice = await db.query.device.findFirst({
					where: eq(device.sessionId, client.session.id),
				});
				if (actorDevice) {
					actorDeviceName = actorDevice.name;
				}
			}

			const userSessions = wsSessionManager.getSessionsByUserId(userId);
			const broadcastPayload = JSON.stringify({
				id: data.id,
				terminatedBy: actorDeviceName,
			});

			for (const session of userSessions) {
				session.sendPacket(PacketType.DEVICE_REMOVED, (w) => w.writeString(broadcastPayload));
			}

			Logger.debug(transportType, `Device deleted: ${data.id}, Session terminated: ${existingDevice.sessionId}`);
		} catch (error) {
			const msg = (error as Error).message;
			Logger.error(transportType, `Failed to delete device: ${msg}`);
			client.sendPacket(PacketType.ERROR_GENERIC, (w) => w.writeString("Delete failed: " + msg), requestId);
		}
	};

	router.register(PacketType.DEVICE_RENAME, handleDeviceRename);
	router.register(PacketType.DEVICE_DELETE, handleDeviceDelete);
}

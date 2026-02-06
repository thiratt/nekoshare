import { db } from "@/adapters/db";
import { device } from "@/adapters/db/schemas";
import { Logger } from "@/core/logger";
import { eq, or } from "drizzle-orm";
import { wsSessionManager } from "../../ws/connection";
import { tcpSessionManager } from "../../tcp/connection";
import { PacketType } from "../protocol";
import type { CommandHandler, IConnection, TransportType } from "../types";
import type { PacketRouter } from "../router";
import { safeJsonParse } from "@/core/utils/json-helper";

function findConnectionBySessionId(sessionId: string | null): IConnection | undefined {
	if (!sessionId) return undefined;

	for (const session of wsSessionManager.getAllSessions()) {
		if (session.session?.id === sessionId) {
			return session;
		}
	}

	for (const session of tcpSessionManager.getAllSessions()) {
		if (session.session?.id === sessionId) {
			return session;
		}
	}

	return undefined;
}

async function findConnectionByDeviceId(targetDeviceId: string): Promise<IConnection | undefined> {
	const targetDevice = await db.query.device.findFirst({
		where: or(eq(device.id, targetDeviceId), eq(device.deviceIdentifier, targetDeviceId)),
		columns: { id: true, deviceIdentifier: true, sessionId: true },
	});

	Logger.debug(
		"FileTransfer",
		`Looking up device ${targetDeviceId}, found: id=${targetDevice?.id ?? "none"}, deviceIdentifier=${targetDevice?.deviceIdentifier ?? "none"}, sessionId: ${targetDevice?.sessionId ?? "none"}`,
	);

	if (!targetDevice?.sessionId) {
		Logger.warn("FileTransfer", `Device ${targetDeviceId} has no associated session in database`);
		return undefined;
	}

	const conn = findConnectionBySessionId(targetDevice.sessionId);
	Logger.debug("FileTransfer", `Found connection for sessionId ${targetDevice.sessionId}: ${conn ? "yes" : "no"}`);
	return conn;
}

async function getDeviceIdForConnection(conn: IConnection): Promise<string | undefined> {
	if (!conn.session?.id) return undefined;

	const deviceInfo = await db.query.device.findFirst({
		where: eq(device.sessionId, conn.session.id),
		columns: { id: true },
	});

	return deviceInfo?.id;
}

const handleFileOffer: CommandHandler<IConnection> = async (client, reader, requestId) => {
	try {
		const rawData = reader.readString();
		const { data, error } = safeJsonParse<{
			transferId: string;
			fromDeviceId: string;
			toDeviceId: string;
			files: {
				name: string;
				size: number;
				extension: string;
			}[];
		}>(rawData);

		if (error || !data) {
			throw new Error("Invalid payload");
		}

		const targetDeviceId = data.toDeviceId;
		const senderDeviceId = data.fromDeviceId;
		const finderprint = await db.query.device.findFirst({
			where: eq(device.id, senderDeviceId),
			columns: { fingerprint: true },
		});

		if (!finderprint) {
			throw new Error(`Sender device ${senderDeviceId} not found in database`);
		}

		Logger.info("FileTransfer", `FILE_OFFER from ${senderDeviceId} to ${targetDeviceId}`);

		const targetConnection = await findConnectionByDeviceId(targetDeviceId);

		if (!targetConnection) {
			Logger.warn("FileTransfer", `Target device ${targetDeviceId} not connected`);
			client.sendPacket(
				PacketType.FILE_REJECT,
				(w) => {
					const rejection = {
						transferId: data.transferId,
						reason: "Target device is not connected",
					};
					w.writeString(JSON.stringify(rejection));
				},
				requestId,
			);
			return;
		}

		targetConnection.sendPacket(PacketType.FILE_OFFER, (w) => {
			const payload = {
				transferId: data.transferId,
				senderDeviceId,
				senderDeviceFingerprint: finderprint.fingerprint,
				files: data.files,
			};
			w.writeString(JSON.stringify(payload));
		});

		Logger.info("FileTransfer", `FILE_OFFER forwarded to ${targetDeviceId}`);
	} catch (error) {
		Logger.error("FileTransfer", `Failed to handle FILE_OFFER: ${error}`);
	}
};

const handleFileAccept: CommandHandler<IConnection> = async (client, reader, requestId) => {
	Logger.info("FileTransfer", `FILE_ACCEPT handler called, requestId: ${requestId}`);
	try {
		const rawData = reader.readString();
		const { data, error } = safeJsonParse<{
			transferId: string;
			senderDeviceId: string;
			address: string;
			port: number;
		}>(rawData);

		if (error || !data) {
			throw new Error("Invalid payload");
		}

		const targetDeviceId = data.senderDeviceId;
		const receiverDeviceId = await getDeviceIdForConnection(client);

		if (!receiverDeviceId) {
			throw new Error("Could not determine receiver device ID from connection");
		}

		const receiverFingerprint = await db.query.device.findFirst({
			where: eq(device.id, receiverDeviceId),
			columns: { fingerprint: true },
		});

		if (!receiverFingerprint) {
			throw new Error(`Receiver device ${receiverDeviceId} not found in database`);
		}

		Logger.info("FileTransfer", `FILE_ACCEPT from ${receiverDeviceId ?? "unknown"} to ${targetDeviceId}`);

		const senderConnection = await findConnectionByDeviceId(targetDeviceId);

		if (!senderConnection) {
			Logger.warn("FileTransfer", `Sender device ${targetDeviceId} not connected`);
			return;
		}

		senderConnection.sendPacket(PacketType.FILE_ACCEPT, (w) => {
			const payload = {
				...data,
				receiverDeviceId: receiverDeviceId,
				receiverFingerprint: receiverFingerprint.fingerprint,
			};
			console.log(payload);
			w.writeString(JSON.stringify(payload));
		});

		Logger.info("FileTransfer", `FILE_ACCEPT forwarded to ${targetDeviceId}`);
	} catch (error) {
		Logger.error("FileTransfer", `Failed to handle FILE_ACCEPT: ${error}`);
	}
};

const handleFileReject: CommandHandler<IConnection> = async (client, reader, requestId) => {
	try {
		// TODO: Example rejection payload parsing and forwarding
		// Implement with actual rejection data structure
		const rawData = reader.readString();
		const { data, error } = safeJsonParse<{
			transferId: string;
			receiverDeviceId: string;
			reason: string;
		}>(rawData);

		if (error || !data) {
			throw new Error("Invalid payload");
		}

		const targetDeviceId = data.receiverDeviceId;

		const rejectorDeviceId = await getDeviceIdForConnection(client);
		Logger.info("FileTransfer", `FILE_REJECT from ${rejectorDeviceId ?? "unknown"} to ${targetDeviceId}`);

		const senderConnection = await findConnectionByDeviceId(targetDeviceId);

		if (!senderConnection) {
			Logger.warn("FileTransfer", `Sender device ${targetDeviceId} not connected`);
			return;
		}

		senderConnection.sendPacket(PacketType.FILE_REJECT, (w) => {
			w.writeString(JSON.stringify(data));
		});

		Logger.info("FileTransfer", `FILE_REJECT forwarded to ${targetDeviceId}`);
	} catch (error) {
		Logger.error("FileTransfer", `Failed to handle FILE_REJECT: ${error}`);
	}
};

const handleFileAck: CommandHandler<IConnection> = async (client, reader, requestId) => {
	try {
		const targetDeviceId = reader.readString();
		const ackJson = reader.readString();

		const senderDeviceId = await getDeviceIdForConnection(client);
		Logger.info("FileTransfer", `FILE_ACK from ${senderDeviceId ?? "unknown"} to ${targetDeviceId}`);

		const targetConnection = await findConnectionByDeviceId(targetDeviceId);

		if (!targetConnection) {
			Logger.warn("FileTransfer", `Target device ${targetDeviceId} not connected`);
			return;
		}

		targetConnection.sendPacket(PacketType.FILE_ACK, (w) => {
			w.writeString(ackJson);
		});

		Logger.info("FileTransfer", `FILE_ACK forwarded to ${targetDeviceId}`);
	} catch (error) {
		Logger.error("FileTransfer", `Failed to handle FILE_ACK: ${error}`);
	}
};

export function registerFileTransferHandlers<T extends IConnection>(
	router: PacketRouter<T>,
	transportType: TransportType,
) {
	router.register(PacketType.FILE_OFFER, handleFileOffer);
	router.register(PacketType.FILE_ACCEPT, handleFileAccept);
	router.register(PacketType.FILE_REJECT, handleFileReject);
	router.register(PacketType.FILE_ACK, handleFileAck);
	Logger.info("FileTransfer", `File transfer handlers registered for ${transportType}`);
}

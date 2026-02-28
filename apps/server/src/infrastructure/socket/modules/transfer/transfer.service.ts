import { Logger } from "@/infrastructure/logger";
import { PacketType } from "@workspace/contracts/ws";

import type { IConnection } from "@/infrastructure/socket/runtime/types";
import { findConnectionBySessionId } from "./transfer.gateway";
import { transferRepository } from "./transfer.repository";
import type { FileAcceptPacketInput, FileOfferPacketInput, FileRejectPacketInput } from "./transfer.types";
import {
	ensureTransferParticipants,
	getTransferSessionForFallback,
	markTransferAccepted,
	registerTransferOffer,
	removeTransferSession,
	resolveTransferForAck,
} from "./transfer.state";

function sendJsonPacket(client: IConnection, packetType: PacketType, payload: object, requestId?: number): void {
	client.sendPacket(
		packetType,
		(writer) => {
			writer.writeString(JSON.stringify(payload));
		},
		requestId,
	);
}

async function findConnectionByDeviceId(targetDeviceId: string): Promise<IConnection | undefined> {
	const targetDevice = await transferRepository.findDeviceSessionById(targetDeviceId);

	Logger.debug(
		"FileTransfer",
		`Looking up device ${targetDeviceId}, found: id=${targetDevice?.id ?? "none"}, currentSessionId: ${targetDevice?.currentSessionId ?? "none"}`,
	);

	if (!targetDevice?.currentSessionId) {
		Logger.warn("FileTransfer", `Device ${targetDeviceId} has no associated session in database`);
		return undefined;
	}

	const conn = findConnectionBySessionId(targetDevice.currentSessionId);
	Logger.debug(
		"FileTransfer",
		`Found connection for sessionId ${targetDevice.currentSessionId}: ${conn ? "yes" : "no"}`,
	);
	return conn;
}

export async function getDeviceIdForConnection(conn: IConnection): Promise<string | undefined> {
	if (!conn.session?.id) {
		return undefined;
	}

	const deviceInfo = await transferRepository.findDeviceIdBySessionId(conn.session.id);
	return deviceInfo?.id;
}

export async function processFileOffer(
	client: IConnection,
	requestId: number,
	payload: FileOfferPacketInput,
): Promise<void> {
	const transferId = payload.transferId?.trim();
	const targetDeviceId = payload.toDeviceId?.trim();
	if (!transferId || !targetDeviceId || !Array.isArray(payload.files) || payload.files.length === 0) {
		throw new Error("Invalid FILE_OFFER payload");
	}

	const senderDeviceId = await getDeviceIdForConnection(client);
	if (!senderDeviceId) {
		throw new Error("Unauthorized sender device");
	}

	if (payload.fromDeviceId && payload.fromDeviceId !== senderDeviceId) {
		Logger.warn(
			"FileTransfer",
			`Ignored spoofed fromDeviceId=${payload.fromDeviceId}; using authenticated deviceId=${senderDeviceId}`,
		);
	}

	if (senderDeviceId === targetDeviceId) {
		throw new Error("Cannot transfer files to the same device");
	}

	const senderDevice = await transferRepository.findSenderDevice(senderDeviceId);
	if (!senderDevice) {
		throw new Error(`Sender device ${senderDeviceId} not found in database`);
	}

	const senderUser = await transferRepository.findUserSummary(senderDevice.userId);

	const targetConnection = await findConnectionByDeviceId(targetDeviceId);
	if (!targetConnection) {
		Logger.warn("FileTransfer", `Target device ${targetDeviceId} not connected`);
		sendJsonPacket(
			client,
			PacketType.FILE_REJECT,
			{
				transferId,
				senderDeviceId,
				reason: "Target device is not connected",
			},
			requestId,
		);
		return;
	}

	const registrationResult = registerTransferOffer(transferId, senderDeviceId, targetDeviceId);
	if (!registrationResult.ok) {
		throw new Error(registrationResult.reason);
	}

	Logger.info("FileTransfer", `FILE_OFFER from ${senderDeviceId} to ${targetDeviceId}`);

	sendJsonPacket(targetConnection, PacketType.FILE_OFFER, {
		transferId,
		senderDeviceId,
		senderDeviceFingerprint: senderDevice.fingerprint,
		senderDeviceName: senderDevice.deviceName,
		senderUserId: senderUser?.id ?? null,
		senderUserName: senderUser?.name ?? null,
		files: payload.files,
	});

	Logger.info("FileTransfer", `FILE_OFFER forwarded to ${targetDeviceId}`);
}

export async function processFileAccept(client: IConnection, payload: FileAcceptPacketInput): Promise<void> {
	const transferId = payload.transferId?.trim();
	const senderDeviceId = payload.senderDeviceId?.trim();
	if (!transferId || !senderDeviceId || typeof payload.address !== "string" || typeof payload.port !== "number") {
		throw new Error("Invalid FILE_ACCEPT payload");
	}

	if (payload.port < 1 || payload.port > 65535) {
		throw new Error("Invalid FILE_ACCEPT port");
	}

	const receiverDeviceId = await getDeviceIdForConnection(client);
	if (!receiverDeviceId) {
		throw new Error("Could not determine receiver device ID from connection");
	}

	const transferSession = ensureTransferParticipants(transferId, senderDeviceId, receiverDeviceId);
	if (!transferSession) {
		throw new Error("FILE_ACCEPT does not match an active transfer session");
	}

	const senderConnection = await findConnectionByDeviceId(senderDeviceId);
	if (!senderConnection) {
		Logger.warn("FileTransfer", `Sender device ${senderDeviceId} not connected`);
		return;
	}

	const receiverDevice = await transferRepository.findDeviceFingerprint(receiverDeviceId);
	if (!receiverDevice) {
		throw new Error(`Receiver device ${receiverDeviceId} not found in database`);
	}

	markTransferAccepted(transferSession.transferId);
	Logger.info("FileTransfer", `FILE_ACCEPT from ${receiverDeviceId} to ${senderDeviceId}`);

	sendJsonPacket(senderConnection, PacketType.FILE_ACCEPT, {
		transferId,
		senderDeviceId,
		receiverDeviceId,
		receiverFingerprint: receiverDevice.fingerprint,
		address: payload.address,
		port: payload.port,
	});

	Logger.info("FileTransfer", `FILE_ACCEPT forwarded to ${senderDeviceId}`);
}

export async function processFileReject(client: IConnection, payload: FileRejectPacketInput): Promise<void> {
	const transferId = payload.transferId?.trim();
	if (!transferId) {
		throw new Error("Invalid FILE_REJECT payload");
	}

	const rejectorDeviceId = await getDeviceIdForConnection(client);
	if (!rejectorDeviceId) {
		throw new Error("Unauthorized rejector device");
	}

	const fallbackSession = getTransferSessionForFallback(transferId);
	const senderDeviceId =
		payload.senderDeviceId?.trim() || payload.receiverDeviceId?.trim() || fallbackSession?.senderDeviceId;

	if (!senderDeviceId) {
		throw new Error("Missing sender device for FILE_REJECT");
	}

	const transferSession = ensureTransferParticipants(transferId, senderDeviceId, rejectorDeviceId);
	if (!transferSession) {
		throw new Error("FILE_REJECT does not match an active transfer session");
	}

	Logger.info("FileTransfer", `FILE_REJECT from ${rejectorDeviceId} to ${senderDeviceId}`);
	removeTransferSession(transferId);

	const senderConnection = await findConnectionByDeviceId(senderDeviceId);
	if (!senderConnection) {
		Logger.warn("FileTransfer", `Sender device ${senderDeviceId} not connected`);
		return;
	}

	sendJsonPacket(senderConnection, PacketType.FILE_REJECT, {
		transferId,
		senderDeviceId,
		reason: payload.reason ?? "Transfer rejected by receiver",
	});

	Logger.info("FileTransfer", `FILE_REJECT forwarded to ${senderDeviceId}`);
}

export async function processFileAck(client: IConnection, targetDeviceId: string, ackJson: string): Promise<void> {
	if (!targetDeviceId) {
		throw new Error("Invalid FILE_ACK target device");
	}

	const senderDeviceId = await getDeviceIdForConnection(client);
	if (!senderDeviceId) {
		throw new Error("Unauthorized ACK sender");
	}

	const transferSession = resolveTransferForAck(senderDeviceId, targetDeviceId, ackJson);
	if (!transferSession) {
		throw new Error("FILE_ACK does not match an accepted transfer session");
	}

	Logger.info(
		"FileTransfer",
		`FILE_ACK for transfer ${transferSession.transferId} from ${senderDeviceId} to ${targetDeviceId}`,
	);

	const targetConnection = await findConnectionByDeviceId(targetDeviceId);
	if (!targetConnection) {
		Logger.warn("FileTransfer", `Target device ${targetDeviceId} not connected`);
		return;
	}

	targetConnection.sendPacket(PacketType.FILE_ACK, (writer) => {
		writer.writeString(ackJson);
	});
	Logger.info("FileTransfer", `FILE_ACK forwarded to ${targetDeviceId}`);
}

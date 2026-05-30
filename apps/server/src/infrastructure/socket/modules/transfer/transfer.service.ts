import {
	findConnectionTargetByDeviceId as findConnectionByDeviceIdRoute,
	findConnectionTargetBySessionId,
} from "./transfer.gateway";
import { transferRepository } from "./transfer.repository";
import {
	ensureTransferParticipants,
	getTransferSessionForFallback,
	markTransferAccepted,
	registerTransferOffer,
	removeTransferSession,
	resolveTransferForAck,
} from "./transfer.state";
import type { FileAcceptPacketInput, FileOfferPacketInput, FileRejectPacketInput } from "./transfer.types";

import { Logger } from "@/infrastructure/logger";
import { type ConnectionTarget, sendJsonPacketToConnectionTarget } from "@/infrastructure/socket/routing";
import type { IConnection } from "@/infrastructure/socket/runtime/types";
import { createTransferService } from "@/modules/transfers";
import { PacketType } from "@workspace/contracts/ws";

const transferService = createTransferService({
	devices: transferRepository,
	lifecycle: {
		registerTransferOffer,
		ensureTransferParticipants,
		markTransferAccepted,
		removeTransferSession,
		resolveTransferForAck,
		getTransferSessionForFallback,
	},
});

function sendJsonPacket(client: IConnection, packetType: PacketType, payload: object, requestId?: number): void {
	client.sendPacket(
		packetType,
		(writer) => {
			writer.writeString(JSON.stringify(payload));
		},
		requestId,
	);
}

async function findConnectionByDeviceId(targetDeviceId: string): Promise<ConnectionTarget | undefined> {
	const routedConnection = await findConnectionByDeviceIdRoute(targetDeviceId);
	if (routedConnection) {
		Logger.debug("FileTransfer", `Resolved device ${targetDeviceId} via routing index`);
		return routedConnection;
	}

	const targetDevice = await transferRepository.findDeviceSessionById(targetDeviceId);

	Logger.debug(
		"FileTransfer",
		`Looking up device ${targetDeviceId}, found: id=${targetDevice?.id ?? "none"}, currentSessionId: ${targetDevice?.currentSessionId ?? "none"}`,
	);

	if (!targetDevice?.currentSessionId) {
		Logger.warn("FileTransfer", `Device ${targetDeviceId} has no associated session in database`);
		return undefined;
	}

	const conn = await findConnectionTargetBySessionId(targetDevice.currentSessionId);
	Logger.debug(
		"FileTransfer",
		`Found connection target for sessionId ${targetDevice.currentSessionId}: ${conn ? conn.kind : "no"}`,
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
	const senderDeviceId = await getDeviceIdForConnection(client);
	const offer = await transferService.prepareFileOffer(payload, senderDeviceId);

	if (offer.spoofedFromDeviceId) {
		Logger.warn(
			"FileTransfer",
			`Ignored spoofed fromDeviceId=${offer.spoofedFromDeviceId}; using authenticated deviceId=${offer.senderDeviceId}`,
		);
	}

	const targetConnectionTarget = await findConnectionByDeviceId(offer.targetDeviceId);
	if (!targetConnectionTarget) {
		Logger.warn("FileTransfer", `Target device ${offer.targetDeviceId} not connected`);
		sendJsonPacket(
			client,
			PacketType.FILE_REJECT,
			transferService.getFileOfferTargetUnavailablePayload(offer),
			requestId,
		);
		return;
	}

	const forwardPayload = await transferService.createFileOfferForwardPayload(offer);
	Logger.info("FileTransfer", `FILE_OFFER from ${offer.senderDeviceId} to ${offer.targetDeviceId}`);
	const delivered = await sendJsonPacketToConnectionTarget(
		targetConnectionTarget,
		PacketType.FILE_OFFER,
		JSON.stringify(forwardPayload),
	);
	if (!delivered) {
		await removeTransferSession(offer.transferId);
		Logger.warn("FileTransfer", `Failed to relay FILE_OFFER to ${offer.targetDeviceId}`);
		sendJsonPacket(
			client,
			PacketType.FILE_REJECT,
			transferService.getFileOfferUnreachablePayload(offer),
			requestId,
		);
		return;
	}

	Logger.info("FileTransfer", `FILE_OFFER forwarded to ${offer.targetDeviceId}`);
}

export async function processFileAccept(client: IConnection, payload: FileAcceptPacketInput): Promise<void> {
	const receiverDeviceId = await getDeviceIdForConnection(client);
	const accept = await transferService.prepareFileAccept(payload, receiverDeviceId);

	const senderConnectionTarget = await findConnectionByDeviceId(accept.senderDeviceId);
	if (!senderConnectionTarget) {
		Logger.warn("FileTransfer", `Sender device ${accept.senderDeviceId} not connected`);
		return;
	}

	const forwardPayload = await transferService.createFileAcceptForwardPayload(accept);
	Logger.info("FileTransfer", `FILE_ACCEPT from ${accept.receiverDeviceId} to ${accept.senderDeviceId}`);
	const delivered = await sendJsonPacketToConnectionTarget(
		senderConnectionTarget,
		PacketType.FILE_ACCEPT,
		JSON.stringify(forwardPayload),
	);
	if (!delivered) {
		Logger.warn("FileTransfer", `Failed to relay FILE_ACCEPT to ${accept.senderDeviceId}`);
		return;
	}

	Logger.info("FileTransfer", `FILE_ACCEPT forwarded to ${accept.senderDeviceId}`);
}

export async function processFileReject(client: IConnection, payload: FileRejectPacketInput): Promise<void> {
	const rejectorDeviceId = await getDeviceIdForConnection(client);
	const reject = await transferService.createFileRejectForwardPayload(payload, rejectorDeviceId);

	Logger.info("FileTransfer", `FILE_REJECT from ${rejectorDeviceId} to ${reject.targetDeviceId}`);

	const senderConnectionTarget = await findConnectionByDeviceId(reject.targetDeviceId);
	if (!senderConnectionTarget) {
		Logger.warn("FileTransfer", `Sender device ${reject.targetDeviceId} not connected`);
		return;
	}
	const delivered = await sendJsonPacketToConnectionTarget(
		senderConnectionTarget,
		PacketType.FILE_REJECT,
		JSON.stringify(reject.payload),
	);
	if (!delivered) {
		Logger.warn("FileTransfer", `Failed to relay FILE_REJECT to ${reject.targetDeviceId}`);
		return;
	}

	Logger.info("FileTransfer", `FILE_REJECT forwarded to ${reject.targetDeviceId}`);
}

export async function processFileAck(client: IConnection, targetDeviceId: string, ackJson: string): Promise<void> {
	const senderDeviceId = await getDeviceIdForConnection(client);
	const ack = await transferService.resolveFileAck(senderDeviceId, targetDeviceId, ackJson);

	Logger.info(
		"FileTransfer",
		`FILE_ACK for transfer ${ack.transferSession.transferId} from ${ack.senderDeviceId} to ${ack.targetDeviceId}`,
	);

	const targetConnectionTarget = await findConnectionByDeviceId(ack.targetDeviceId);
	if (!targetConnectionTarget) {
		Logger.warn("FileTransfer", `Target device ${ack.targetDeviceId} not connected`);
		return;
	}
	const delivered = await sendJsonPacketToConnectionTarget(targetConnectionTarget, PacketType.FILE_ACK, ackJson);
	if (!delivered) {
		Logger.warn("FileTransfer", `Failed to relay FILE_ACK to ${ack.targetDeviceId}`);
		return;
	}
	Logger.info("FileTransfer", `FILE_ACK forwarded to ${ack.targetDeviceId}`);
}

import {
	mapLegacyFileAcceptToTransferAcceptCommand,
	mapLegacyFileAckToTransferStatusOrProgress,
	mapLegacyFileOfferToTransferOfferCommand,
	mapLegacyFileRejectToTransferRejectCommand,
	mapTransferRejectedEventToLegacyFileReject,
} from "./legacy-file-packet.mapper";
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
import {
	emitTransferAccepted,
	emitTransferOffered,
	emitTransferProgress,
	emitTransferRejected,
} from "./transfer-control-emitter";
import type { FileAcceptPacketInput, FileOfferPacketInput, FileRejectPacketInput } from "./transfer.types";

import { Logger } from "@/infrastructure/logger";
import { getRedisClient } from "@/infrastructure/redis";
import { type ConnectionTarget, sendJsonPacketToConnectionTarget } from "@/infrastructure/socket/routing";
import type { IConnection } from "@/infrastructure/socket/runtime/types";
import { createTransferService, RedisTransferRuntimeStore, type TransferRuntimeRedisClient } from "@/modules/transfers";
import { createTransferFailure, TransferErrorCode } from "@/modules/transfers/domain";
import { PacketType } from "@workspace/contracts/ws";

function parseLegacyAckPayload(ackJson: string): Record<string, unknown> {
	try {
		const parsed = JSON.parse(ackJson);
		return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
	} catch {
		return {};
	}
}

let transferService: ReturnType<typeof createTransferService> | null = null;

function getTransferService() {
	if (!transferService) {
		transferService = createTransferService({
			devices: transferRepository,
			lifecycle: {
				registerTransferOffer,
				ensureTransferParticipants,
				markTransferAccepted,
				removeTransferSession,
				resolveTransferForAck,
				getTransferSessionForFallback,
			},
			runtimeStore: new RedisTransferRuntimeStore(getRedisClient() as unknown as TransferRuntimeRedisClient),
			onRuntimeError(operation, error) {
				Logger.warn("FileTransfer", `Failed to ${operation}`, error);
			},
		});
	}

	return transferService;
}

function sendJsonPacket(client: IConnection, packetType: PacketType, payload: object, requestId?: number): void {
	client.sendPacket(
		packetType,
		(writer) => {
			writer.writeString(JSON.stringify(payload));
		},
		requestId,
	);
}

function mapOfferFailureToLegacyFileReject(offer: { transferId: string; senderDeviceId: string }, reason: string) {
	return mapTransferRejectedEventToLegacyFileReject(
		{
			transferId: offer.transferId,
			reason,
		},
		{
			senderDeviceId: offer.senderDeviceId,
		},
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
	// Neko Protocol v1 internal command starts here. The wire packet remains FILE_OFFER.
	const transferOfferCommand = mapLegacyFileOfferToTransferOfferCommand({
		transferId: payload.transferId ?? "",
		fromDeviceId: payload.fromDeviceId,
		toDeviceId: payload.toDeviceId ?? "",
		files: payload.files ?? [],
	});
	const transferOffer = await getTransferService().prepareTransferOffer(transferOfferCommand, senderDeviceId, {
		files: payload.files,
	});
	const offer = transferOffer.offer;
	const traceId = transferOfferCommand.transferId;
	Logger.debug("FileTransfer", `Mapped FILE_OFFER request ${requestId} to TRANSFER_OFFER command trace=${traceId}`);

	if (offer.spoofedFromDeviceId) {
		Logger.warn(
			"FileTransfer",
			`Ignored spoofed fromDeviceId=${offer.spoofedFromDeviceId}; using authenticated deviceId=${offer.senderDeviceId}`,
		);
	}

	const targetConnectionTarget = await findConnectionByDeviceId(offer.targetDeviceId);
	if (!targetConnectionTarget) {
		const failure = createTransferFailure(TransferErrorCode.DEVICE_OFFLINE, "Target device is not connected");
		Logger.warn("FileTransfer", `Target device ${offer.targetDeviceId} not connected (${failure.code})`);
		sendJsonPacket(
			client,
			PacketType.FILE_REJECT,
			mapOfferFailureToLegacyFileReject(offer, "Target device is not connected"),
			requestId,
		);
		return;
	}

	const forwardPayload = await getTransferService().createFileOfferForwardPayload(offer);
	Logger.info("FileTransfer", `FILE_OFFER from ${offer.senderDeviceId} to ${offer.targetDeviceId}`);
	const delivered = await emitTransferOffered(
		{
			targetConnection: targetConnectionTarget,
			sendLegacyPacket: (packetType, payloadJson) =>
				sendJsonPacketToConnectionTarget(targetConnectionTarget, packetType, payloadJson),
		},
		{
			event: transferOffer.event,
			legacy: {
				senderDeviceFingerprint: forwardPayload.senderDeviceFingerprint,
				senderDeviceName: forwardPayload.senderDeviceName,
				senderUserId: forwardPayload.senderUserId,
				senderUserName: forwardPayload.senderUserName,
				files: forwardPayload.files,
			},
		},
	);
	if (!delivered) {
		await removeTransferSession(offer.transferId);
		const failure = createTransferFailure(TransferErrorCode.DEVICE_OFFLINE, "Target device is unreachable");
		Logger.warn("FileTransfer", `Failed to relay FILE_OFFER to ${offer.targetDeviceId} (${failure.code})`);
		sendJsonPacket(
			client,
			PacketType.FILE_REJECT,
			mapOfferFailureToLegacyFileReject(offer, "Target device is unreachable"),
			requestId,
		);
		return;
	}

	Logger.info("FileTransfer", `FILE_OFFER forwarded to ${offer.targetDeviceId}`);
}

export async function processFileAccept(
	client: IConnection,
	payload: FileAcceptPacketInput,
	requestId?: number,
): Promise<void> {
	const receiverDeviceId = await getDeviceIdForConnection(client);
	// Neko Protocol v1 internal command starts here. The wire packet remains FILE_ACCEPT.
	const transferAcceptCommand = mapLegacyFileAcceptToTransferAcceptCommand({
		transferId: payload.transferId ?? "",
		senderDeviceId: payload.senderDeviceId ?? "",
		receiverDeviceId: receiverDeviceId ?? "",
		receiverFingerprint: "",
		address: payload.address ?? "",
		port: payload.port ?? 0,
	});
	const transferAccept = await getTransferService().prepareTransferAccept(transferAcceptCommand, {
		authenticatedReceiverDeviceId: receiverDeviceId,
		senderDeviceId: payload.senderDeviceId,
		address: payload.address,
		port: payload.port,
	});
	const accept = transferAccept.accept;
	Logger.debug(
		"FileTransfer",
		`Mapped FILE_ACCEPT request ${requestId ?? "unknown"} to TRANSFER_ACCEPT command trace=${transferAcceptCommand.transferId}`,
	);

	const senderConnectionTarget = await findConnectionByDeviceId(accept.senderDeviceId);
	if (!senderConnectionTarget) {
		Logger.warn("FileTransfer", `Sender device ${accept.senderDeviceId} not connected`);
		return;
	}

	const forwardPayload = await getTransferService().createFileAcceptForwardPayload(accept);
	Logger.info("FileTransfer", `FILE_ACCEPT from ${accept.receiverDeviceId} to ${accept.senderDeviceId}`);
	const delivered = await emitTransferAccepted(
		{
			targetConnection: senderConnectionTarget,
			sendLegacyPacket: (packetType, payloadJson) =>
				sendJsonPacketToConnectionTarget(senderConnectionTarget, packetType, payloadJson),
		},
		{
			event: transferAccept.event,
			legacy: {
				senderDeviceId: forwardPayload.senderDeviceId,
				receiverFingerprint: forwardPayload.receiverFingerprint,
				address: forwardPayload.address,
				port: forwardPayload.port,
			},
		},
	);
	if (!delivered) {
		Logger.warn("FileTransfer", `Failed to relay FILE_ACCEPT to ${accept.senderDeviceId}`);
		return;
	}

	Logger.info("FileTransfer", `FILE_ACCEPT forwarded to ${accept.senderDeviceId}`);
}

export async function processFileReject(
	client: IConnection,
	payload: FileRejectPacketInput,
	requestId?: number,
): Promise<void> {
	const rejectorDeviceId = await getDeviceIdForConnection(client);
	// Neko Protocol v1 internal command starts here. The wire packet remains FILE_REJECT.
	const transferRejectCommand = mapLegacyFileRejectToTransferRejectCommand({
		transferId: payload.transferId ?? "",
		senderDeviceId: payload.senderDeviceId ?? "",
		reason: payload.reason,
	});
	const reject = await getTransferService().prepareTransferReject(transferRejectCommand, {
		rejectorDeviceId,
		senderDeviceId: payload.senderDeviceId,
		receiverDeviceId: payload.receiverDeviceId,
	});
	Logger.debug(
		"FileTransfer",
		`Mapped FILE_REJECT request ${requestId ?? "unknown"} to TRANSFER_REJECT command trace=${transferRejectCommand.transferId}`,
	);
	Logger.info("FileTransfer", `FILE_REJECT from ${rejectorDeviceId} to ${reject.targetDeviceId}`);

	const senderConnectionTarget = await findConnectionByDeviceId(reject.targetDeviceId);
	if (!senderConnectionTarget) {
		Logger.warn("FileTransfer", `Sender device ${reject.targetDeviceId} not connected`);
		return;
	}
	const delivered = await emitTransferRejected(
		{
			targetConnection: senderConnectionTarget,
			sendLegacyPacket: (packetType, payloadJson) =>
				sendJsonPacketToConnectionTarget(senderConnectionTarget, packetType, payloadJson),
		},
		{
			event: reject.event,
			legacy: {
				senderDeviceId: reject.payload.senderDeviceId,
			},
		},
	);
	if (!delivered) {
		Logger.warn("FileTransfer", `Failed to relay FILE_REJECT to ${reject.targetDeviceId}`);
		return;
	}

	Logger.info("FileTransfer", `FILE_REJECT forwarded to ${reject.targetDeviceId}`);
}

export async function processFileAck(
	client: IConnection,
	targetDeviceId: string,
	ackJson: string,
	requestId?: number,
): Promise<void> {
	const senderDeviceId = await getDeviceIdForConnection(client);
	// Neko Protocol v1 internal status/progress interpretation starts here.
	const ack = await getTransferService().prepareTransferAck(senderDeviceId, targetDeviceId, ackJson);
	const transferAckEvent =
		ack.event ??
		mapLegacyFileAckToTransferStatusOrProgress(parseLegacyAckPayload(ackJson), {
			transferId: ack.transferSession.transferId,
		});
	Logger.debug(
		"FileTransfer",
		`Mapped FILE_ACK request ${requestId ?? "unknown"} to internal transfer event trace=${transferAckEvent.transferId}`,
	);

	Logger.info(
		"FileTransfer",
		`FILE_ACK for transfer ${ack.transferSession.transferId} from ${ack.senderDeviceId} to ${ack.targetDeviceId}`,
	);

	const targetConnectionTarget = await findConnectionByDeviceId(ack.targetDeviceId);
	if (!targetConnectionTarget) {
		Logger.warn("FileTransfer", `Target device ${ack.targetDeviceId} not connected`);
		return;
	}
	const canForwardAck = await emitTransferProgress(
		{
			targetConnection: targetConnectionTarget,
			sendLegacyPacket: (packetType, payloadJson) =>
				sendJsonPacketToConnectionTarget(targetConnectionTarget, packetType, payloadJson),
		},
		{
			event:
				"totalBytes" in transferAckEvent
					? transferAckEvent
					: {
							transferId: transferAckEvent.transferId,
							totalBytes: 0,
							bytesTransferred: 0,
							updatedAt: transferAckEvent.updatedAt,
						},
		},
	);
	const delivered = canForwardAck
		? await sendJsonPacketToConnectionTarget(targetConnectionTarget, PacketType.FILE_ACK, ackJson)
		: false;
	if (!delivered) {
		Logger.warn("FileTransfer", `Failed to relay FILE_ACK to ${ack.targetDeviceId}`);
		return;
	}
	Logger.info("FileTransfer", `FILE_ACK forwarded to ${ack.targetDeviceId}`);
}

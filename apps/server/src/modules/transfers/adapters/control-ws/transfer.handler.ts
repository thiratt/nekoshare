import { processFileAccept, processFileAck, processFileOffer, processFileReject } from "./transfer.service";
import type { FileAcceptPacketInput, FileOfferPacketInput, FileRejectPacketInput } from "./transfer.types";

import { Logger } from "@/infrastructure/logger";
import { PacketRouter } from "@/infrastructure/socket/runtime/packet-router";
import type { CommandHandler, IConnection, TransportType } from "@/infrastructure/socket/runtime/types";
import {
	mapTransferFailureToLegacySocketError,
	mapUnknownErrorToTransferFailure,
	TransferErrorCode,
} from "@/modules/transfers/domain";
import { safeJsonParse } from "@/shared/utils/json-helper";
import { PacketType } from "@workspace/contracts/ws";

function sendError(client: IConnection, requestId: number, message: string): void {
	client.sendPacket(
		PacketType.ERROR_GENERIC,
		(writer) => {
			writer.writeString(JSON.stringify({ message }));
		},
		requestId,
	);
}

function sendLegacyTransferError(client: IConnection, requestId: number, prefix: string, error: unknown): void {
	const failure = mapUnknownErrorToTransferFailure(error);
	const legacyError = mapTransferFailureToLegacySocketError(failure);
	Logger.error("FileTransfer", `${prefix}: ${legacyError.message} (${legacyError.code})`);

	// Legacy control-WS compatibility: clients still receive ERROR_GENERIC with
	// the same message-only JSON shape. The normalized code remains internal for now.
	sendError(client, requestId, `${prefix.replace("Failed to handle ", "")} rejected: ${legacyError.message}`);
}

export function registerTransferHandlers<T extends IConnection>(router: PacketRouter<T>, transportType: TransportType) {
	const handleFileOffer: CommandHandler<T> = async (client, reader, requestId) => {
		try {
			// Legacy FILE_* wire packet enters here. It is translated inside the
			// transfer control adapter before any future Protocol v1 routing.
			const rawData = reader.readString();
			const { data, error } = safeJsonParse<FileOfferPacketInput>(rawData);
			if (error || !data) {
				throw {
					code: TransferErrorCode.PROTOCOL_VIOLATION,
					message: "Invalid FILE_OFFER payload",
					retryable: false,
				};
			}

			await processFileOffer(client, requestId, data);
		} catch (error) {
			sendLegacyTransferError(client, requestId, "Failed to handle FILE_OFFER", error);
		}
	};

	const handleFileAccept: CommandHandler<T> = async (client, reader, requestId) => {
		Logger.info("FileTransfer", `FILE_ACCEPT handler called, requestId: ${requestId}`);
		try {
			// Legacy FILE_* wire packet enters here. Outbound compatibility remains FILE_*.
			const rawData = reader.readString();
			const { data, error } = safeJsonParse<FileAcceptPacketInput>(rawData);
			if (error || !data) {
				throw {
					code: TransferErrorCode.PROTOCOL_VIOLATION,
					message: "Invalid FILE_ACCEPT payload",
					retryable: false,
				};
			}

			await processFileAccept(client, data, requestId);
		} catch (error) {
			sendLegacyTransferError(client, requestId, "Failed to handle FILE_ACCEPT", error);
		}
	};

	const handleFileReject: CommandHandler<T> = async (client, reader, requestId) => {
		try {
			// Legacy FILE_* wire packet enters here. It is normalized internally only.
			const rawData = reader.readString();
			const { data, error } = safeJsonParse<FileRejectPacketInput>(rawData);
			if (error || !data) {
				throw {
					code: TransferErrorCode.PROTOCOL_VIOLATION,
					message: "Invalid FILE_REJECT payload",
					retryable: false,
				};
			}

			await processFileReject(client, data, requestId);
		} catch (error) {
			sendLegacyTransferError(client, requestId, "Failed to handle FILE_REJECT", error);
		}
	};

	const handleFileAck: CommandHandler<T> = async (client, reader, requestId) => {
		try {
			// Legacy FILE_ACK framing enters here; data-frame migration is not part of this step.
			const targetDeviceId = reader.readString().trim();
			const ackJson = reader.readString();
			await processFileAck(client, targetDeviceId, ackJson, requestId);
		} catch (error) {
			sendLegacyTransferError(client, requestId, "Failed to handle FILE_ACK", error);
		}
	};

	router.register(PacketType.FILE_OFFER, handleFileOffer);
	router.register(PacketType.FILE_ACCEPT, handleFileAccept);
	router.register(PacketType.FILE_REJECT, handleFileReject);
	router.register(PacketType.FILE_ACK, handleFileAck);
	Logger.info("FileTransfer", `File transfer handlers registered for ${transportType}`);
}

export const registerFileTransferHandlers = registerTransferHandlers;

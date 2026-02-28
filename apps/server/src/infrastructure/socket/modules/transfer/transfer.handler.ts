import { Logger } from "@/infrastructure/logger";
import { safeJsonParse } from "@/shared/utils/json-helper";
import { PacketType } from "@workspace/contracts/ws";

import { PacketRouter } from "@/infrastructure/socket/runtime/packet-router";
import type { CommandHandler, IConnection, TransportType } from "@/infrastructure/socket/runtime/types";
import { processFileAccept, processFileAck, processFileOffer, processFileReject } from "./transfer.service";
import type { FileAcceptPacketInput, FileOfferPacketInput, FileRejectPacketInput } from "./transfer.types";

function sendError(client: IConnection, requestId: number, message: string): void {
	client.sendPacket(
		PacketType.ERROR_GENERIC,
		(writer) => {
			writer.writeString(JSON.stringify({ message }));
		},
		requestId,
	);
}

export function registerTransferHandlers<T extends IConnection>(router: PacketRouter<T>, transportType: TransportType) {
	const handleFileOffer: CommandHandler<T> = async (client, reader, requestId) => {
		try {
			const rawData = reader.readString();
			const { data, error } = safeJsonParse<FileOfferPacketInput>(rawData);
			if (error || !data) {
				throw new Error("Invalid FILE_OFFER payload");
			}

			await processFileOffer(client, requestId, data);
		} catch (error) {
			const message = error instanceof Error ? error.message : "Unknown error";
			Logger.error("FileTransfer", `Failed to handle FILE_OFFER: ${message}`);
			sendError(client, requestId, `FILE_OFFER rejected: ${message}`);
		}
	};

	const handleFileAccept: CommandHandler<T> = async (client, reader, requestId) => {
		Logger.info("FileTransfer", `FILE_ACCEPT handler called, requestId: ${requestId}`);
		try {
			const rawData = reader.readString();
			const { data, error } = safeJsonParse<FileAcceptPacketInput>(rawData);
			if (error || !data) {
				throw new Error("Invalid FILE_ACCEPT payload");
			}

			await processFileAccept(client, data);
		} catch (error) {
			const message = error instanceof Error ? error.message : "Unknown error";
			Logger.error("FileTransfer", `Failed to handle FILE_ACCEPT: ${message}`);
			sendError(client, requestId, `FILE_ACCEPT rejected: ${message}`);
		}
	};

	const handleFileReject: CommandHandler<T> = async (client, reader, requestId) => {
		try {
			const rawData = reader.readString();
			const { data, error } = safeJsonParse<FileRejectPacketInput>(rawData);
			if (error || !data) {
				throw new Error("Invalid FILE_REJECT payload");
			}

			await processFileReject(client, data);
		} catch (error) {
			const message = error instanceof Error ? error.message : "Unknown error";
			Logger.error("FileTransfer", `Failed to handle FILE_REJECT: ${message}`);
			sendError(client, requestId, `FILE_REJECT rejected: ${message}`);
		}
	};

	const handleFileAck: CommandHandler<T> = async (client, reader, requestId) => {
		try {
			const targetDeviceId = reader.readString().trim();
			const ackJson = reader.readString();
			await processFileAck(client, targetDeviceId, ackJson);
		} catch (error) {
			const message = error instanceof Error ? error.message : "Unknown error";
			Logger.error("FileTransfer", `Failed to handle FILE_ACK: ${message}`);
			sendError(client, requestId, `FILE_ACK rejected: ${message}`);
		}
	};

	router.register(PacketType.FILE_OFFER, handleFileOffer);
	router.register(PacketType.FILE_ACCEPT, handleFileAccept);
	router.register(PacketType.FILE_REJECT, handleFileReject);
	router.register(PacketType.FILE_ACK, handleFileAck);
	Logger.info("FileTransfer", `File transfer handlers registered for ${transportType}`);
}

export const registerFileTransferHandlers = registerTransferHandlers;

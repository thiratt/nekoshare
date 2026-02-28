import { Logger } from "@/infrastructure/logger";
import { safeJsonParse } from "@/shared/utils/json-helper";
import { PacketType } from "@workspace/contracts/ws";
import type {
	AckPayload,
	PeerConnectionConfirmPayload,
	PeerConnectRequestPayload,
	PeerConnectResponsePayload,
	PeerDisconnectPayload,
	PeerSocketReadyPayload,
	PeerSocketReadyResponsePayload,
} from "@workspace/contracts/ws";

import { PacketRouter } from "@/infrastructure/socket/runtime/packet-router";
import type { CommandHandler, IConnection, TransportType } from "@/infrastructure/socket/runtime/types";
import { sendJsonPacket } from "./peer.gateway";
import {
	handlePeerConnectRequest,
	handlePeerConnectionConfirm,
	handlePeerDisconnect,
	handlePeerSocketReady,
} from "./peer.service";

function sendConnectFailure(client: IConnection, requestId: number, message: string): void {
	const response: PeerConnectResponsePayload = {
		success: false,
		status: "failed",
		message,
	};
	sendJsonPacket(client, PacketType.PEER_CONNECT_RESPONSE, response, requestId);
}

function sendSocketReadyFailure(client: IConnection, requestId: number, message: string): void {
	const response: PeerSocketReadyResponsePayload = {
		success: false,
		message,
	};
	sendJsonPacket(client, PacketType.PEER_SOCKET_READY, response, requestId);
}

function sendAckFailure(client: IConnection, requestId: number, message: string): void {
	const response: AckPayload = {
		success: false,
		message,
	};
	sendJsonPacket(client, PacketType.ACK, response, requestId);
}

export function registerPeerHandlers<T extends IConnection>(router: PacketRouter<T>, transportType: TransportType) {
	const handleConnect: CommandHandler<T> = async (client, reader, requestId) => {
		try {
			const rawData = reader.readString();
			const { data, error } = safeJsonParse<PeerConnectRequestPayload>(rawData);
			if (error || !data?.targetDeviceId) {
				throw new Error("Invalid payload: targetDeviceId is required");
			}

			await handlePeerConnectRequest(client, transportType, requestId, data);
		} catch (error) {
			const msg = (error as Error).message;
			Logger.error(transportType, `Peer connect request failed: ${msg}`);
			sendConnectFailure(client, requestId, msg);
		}
	};

	const handleSocketReady: CommandHandler<T> = async (client, reader, requestId) => {
		try {
			const rawData = reader.readString();
			const { data, error } = safeJsonParse<PeerSocketReadyPayload>(rawData);
			if (error || !data?.requestId || !data?.port) {
				throw new Error("Invalid payload: requestId and port are required");
			}

			await handlePeerSocketReady(client, transportType, requestId, data);
		} catch (error) {
			const msg = (error as Error).message;
			Logger.error(transportType, `Peer socket ready failed: ${msg}`);
			sendSocketReadyFailure(client, requestId, msg);
		}
	};

	const handleConnectionConfirm: CommandHandler<T> = async (client, reader, requestId) => {
		try {
			const rawData = reader.readString();
			const { data, error } = safeJsonParse<PeerConnectionConfirmPayload>(rawData);
			if (error || !data?.requestId) {
				throw new Error("Invalid payload: requestId is required");
			}

			handlePeerConnectionConfirm(client, transportType, requestId, data);
		} catch (error) {
			const msg = (error as Error).message;
			Logger.error(transportType, `Connection confirm failed: ${msg}`);
			sendAckFailure(client, requestId, msg);
		}
	};

	const handleDisconnect: CommandHandler<T> = async (client, reader, requestId) => {
		try {
			const rawData = reader.readString();
			const { data, error } = safeJsonParse<PeerDisconnectPayload>(rawData);
			if (error || !data?.targetDeviceId) {
				throw new Error("Invalid payload: targetDeviceId is required");
			}

			await handlePeerDisconnect(client, transportType, requestId, data);
		} catch (error) {
			const msg = (error as Error).message;
			Logger.error(transportType, `Peer disconnect failed: ${msg}`);
			sendAckFailure(client, requestId, msg);
		}
	};

	router.register(PacketType.PEER_CONNECT_REQUEST, handleConnect);
	router.register(PacketType.PEER_SOCKET_READY, handleSocketReady);
	router.register(PacketType.PEER_CONNECTION_CONFIRM, handleConnectionConfirm);
	router.register(PacketType.PEER_DISCONNECT, handleDisconnect);
	Logger.debug(transportType, "PeerController handlers registered");
}

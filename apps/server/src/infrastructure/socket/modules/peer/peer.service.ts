import { Logger } from "@/infrastructure/logger";
import { PacketType } from "@workspace/contracts/ws";
import type {
	AckPayload,
	PeerConnectionConfirmPayload,
	PeerConnectionInfoPayload,
	PeerConnectRequestPayload,
	PeerConnectResponsePayload,
	PeerDisconnectedPayload,
	PeerDisconnectPayload,
	PeerIncomingRequestPayload,
	PeerSocketReadyPayload,
	PeerSocketReadyResponsePayload,
} from "@workspace/contracts/ws";

import type { IConnection, TransportType } from "@/infrastructure/socket/runtime/types";
import * as PeerState from "./peer.state";
import { getConnection, getConnectionIp, findConnectionByDeviceSession, sendJsonPacket } from "./peer.gateway";
import { peerRepository } from "./peer.repository";

export async function handlePeerConnectRequest(
	client: IConnection,
	transportType: TransportType,
	requestId: number,
	payload: PeerConnectRequestPayload,
): Promise<void> {
	const userId = client.user?.id;
	if (!userId) {
		throw new Error("Unauthorized: User not authenticated");
	}

	const sourceSessionId = client.session?.id;
	if (!sourceSessionId) {
		throw new Error("No session found for source device");
	}

	const sourceDevice = await peerRepository.findDeviceBySessionAndUser(sourceSessionId, userId);
	if (!sourceDevice) {
		throw new Error("Source device not found or not registered");
	}

	const targetDevice = await peerRepository.findOwnedDeviceById(userId, payload.targetDeviceId);
	if (!targetDevice) {
		throw new Error("Target device not found or does not belong to your account");
	}

	if (targetDevice.id === sourceDevice.id) {
		throw new Error("Cannot connect to yourself");
	}

	const result = PeerState.attemptConnection({
		sourceDeviceId: sourceDevice.id,
		targetDeviceId: targetDevice.id,
		requestId: requestId.toString(),
		sourceConnectionId: client.id,
		sourceTransport: transportType,
	});

	if (!result.success) {
		const response: PeerConnectResponsePayload = result.existingRequestId
			? {
					success: false,
					status: "duplicate",
					requestId: result.existingRequestId,
					message: result.reason,
				}
			: {
					success: false,
					status: "failed",
					message: result.reason,
				};

		sendJsonPacket(client, PacketType.PEER_CONNECT_RESPONSE, response, requestId);
		Logger.debug(
			transportType,
			`Connection attempt rejected: ${sourceDevice.deviceName} -> ${targetDevice.deviceName}: ${result.reason}`,
		);
		return;
	}

	const targetConnection = findConnectionByDeviceSession(targetDevice.currentSessionId);
	if (!targetConnection) {
		PeerState.markDisconnected(sourceDevice.id, targetDevice.id, PeerState.StateChangeReason.DEVICE_OFFLINE);

		const response: PeerConnectResponsePayload = {
			success: false,
			status: "failed",
			message: "Target device is offline",
		};
		sendJsonPacket(client, PacketType.PEER_CONNECT_RESPONSE, response, requestId);
		return;
	}

	Logger.info(
		transportType,
		`Peer connect: ${sourceDevice.deviceName} -> ${targetDevice.deviceName} (${result.requestId})`,
	);

	const incomingRequest: PeerIncomingRequestPayload = {
		requestId: result.requestId,
		sourceDeviceId: sourceDevice.id,
		sourceDeviceName: sourceDevice.deviceName,
		sourceIp: getConnectionIp(client),
		fingerprint: sourceDevice.fingerprint || "",
	};
	sendJsonPacket(targetConnection, PacketType.PEER_INCOMING_REQUEST, incomingRequest);

	const response: PeerConnectResponsePayload = {
		success: true,
		status: "pending",
		requestId: result.requestId,
		message: "Connection request sent to target device",
	};
	sendJsonPacket(client, PacketType.PEER_CONNECT_RESPONSE, response, requestId);
}

export async function handlePeerSocketReady(
	client: IConnection,
	transportType: TransportType,
	requestId: number,
	payload: PeerSocketReadyPayload,
): Promise<void> {
	if (payload.port < 1 || payload.port > 65535) {
		throw new Error("Invalid port number");
	}

	const conn = PeerState.getConnectionByRequestId(payload.requestId);
	if (!conn) {
		throw new Error("No pending request found for this ID");
	}

	const userId = client.user?.id;
	if (!userId) {
		throw new Error("Unauthorized");
	}

	const clientSessionId = client.session?.id;
	if (!clientSessionId) {
		throw new Error("No session found for target device");
	}

	const targetDevice = await peerRepository.findDeviceBySessionAndUser(clientSessionId, userId);
	if (!targetDevice) {
		throw new Error("Device not found");
	}

	if (targetDevice.id !== conn.deviceA && targetDevice.id !== conn.deviceB) {
		throw new Error("Device not part of this connection");
	}

	const updatedConn = PeerState.markTargetAccepted(payload.requestId, client.id, payload.port);
	if (!updatedConn) {
		throw new Error("Failed to update connection state");
	}

	const sourceConnection = getConnection(updatedConn.sourceConnectionId, updatedConn.sourceTransport);
	if (!sourceConnection) {
		Logger.warn(transportType, `Source connection ${updatedConn.sourceConnectionId} no longer available`);
		PeerState.markDisconnected(
			updatedConn.deviceA,
			updatedConn.deviceB,
			PeerState.StateChangeReason.DEVICE_OFFLINE,
		);
		throw new Error("Source device is no longer connected");
	}

	const peerIp = getConnectionIp(client);
	if (!peerIp) {
		throw new Error("Target device has no registered IP address");
	}

	Logger.info(transportType, `Peer socket ready: ${targetDevice.deviceName} at ${peerIp}:${payload.port}`);

	const connectionInfo: PeerConnectionInfoPayload = {
		requestId: payload.requestId,
		ip: peerIp,
		port: payload.port,
		deviceName: targetDevice.deviceName,
		fingerprint: targetDevice.fingerprint || "",
	};
	sendJsonPacket(sourceConnection, PacketType.PEER_CONNECTION_INFO, connectionInfo);

	const response: PeerSocketReadyResponsePayload = {
		success: true,
		message: "Connection info relayed to source device",
	};
	sendJsonPacket(client, PacketType.PEER_SOCKET_READY, response, requestId);
}

export function handlePeerConnectionConfirm(
	client: IConnection,
	transportType: TransportType,
	requestId: number,
	requestPayload: PeerConnectionConfirmPayload,
): void {
	const success = PeerState.markConnected(requestPayload.requestId);
	if (!success) {
		throw new Error("Connection not found or already in different state");
	}

	Logger.info(transportType, `P2P connection confirmed: ${requestPayload.requestId}`);

	const response: AckPayload = {
		success: true,
		message: "Connection confirmed",
	};
	sendJsonPacket(client, PacketType.ACK, response, requestId);
}

export async function handlePeerDisconnect(
	client: IConnection,
	transportType: TransportType,
	requestId: number,
	payload: PeerDisconnectPayload,
): Promise<void> {
	const userId = client.user?.id;
	if (!userId) {
		throw new Error("Unauthorized");
	}

	const clientSessionId = client.session?.id;
	if (!clientSessionId) {
		throw new Error("No session found for source device");
	}

	const sourceDevice = await peerRepository.findDeviceBySessionAndUser(clientSessionId, userId);
	if (!sourceDevice) {
		throw new Error("Source device not found");
	}

	const success = PeerState.markDisconnected(
		sourceDevice.id,
		payload.targetDeviceId,
		PeerState.StateChangeReason.EXPLICIT_DISCONNECT,
	);
	if (success) {
		Logger.info(transportType, `Peer disconnected: ${sourceDevice.id} <-> ${payload.targetDeviceId}`);
	}

	const targetDevice = await peerRepository.findById(payload.targetDeviceId);
	if (targetDevice?.currentSessionId) {
		const targetConnection = findConnectionByDeviceSession(targetDevice.currentSessionId);
		if (targetConnection) {
			const notification: PeerDisconnectedPayload = {
				deviceId: sourceDevice.id,
				reason: payload.reason || "Peer disconnected",
			};
			sendJsonPacket(targetConnection, PacketType.PEER_DISCONNECTED, notification);
		}
	}

	const response: AckPayload = {
		success: true,
		message: "Disconnected",
	};
	sendJsonPacket(client, PacketType.ACK, response, requestId);
}

export function handleDeviceSocketDisconnect(deviceId: string): void {
	const count = PeerState.handleDeviceDisconnect(deviceId);
	if (count > 0) {
		Logger.info("PEER", `Cleaned up ${count} connections for disconnected device ${deviceId}`);
	}
}

export function getPeerConnectionStats() {
	return PeerState.getStats();
}

export function getDeviceConnections(deviceId: string) {
	return PeerState.getActiveConnectionsForDevice(deviceId);
}

export function hasActiveConnection(deviceA: string, deviceB: string): boolean {
	return PeerState.hasActiveConnection(deviceA, deviceB);
}

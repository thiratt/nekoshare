import { db } from "@/adapters/db";
import { device } from "@/adapters/db/schemas";
import { Logger } from "@/core/logger";
import { safeJsonParse } from "@/core/utils/json-helper";
import { and, eq, inArray } from "drizzle-orm";
import { wsSessionManager } from "../../ws/connection";
import { tcpSessionManager } from "../../tcp/connection";
import { PacketType } from "../protocol";
import type { CommandHandler, IConnection, TransportType } from "../types";
import { PacketRouter } from "../router";
import * as PeerState from "../peer-state";

interface PeerConnectRequestPayload {
	targetDeviceId: string;
}

interface PeerSocketReadyPayload {
	requestId: string;
	port: number;
}

interface PeerDisconnectPayload {
	targetDeviceId: string;
	reason?: string;
}

interface PeerConnectionConfirmPayload {
	requestId: string;
}

interface PeerConnectResponsePayload {
	success: boolean;
	status: "pending" | "failed" | "duplicate";
	requestId?: string;
	message: string;
}

interface PeerIncomingRequestPayload {
	requestId: string;
	sourceDeviceId: string;
	sourceDeviceName: string;
	sourceIp: string;
}

interface PeerConnectionInfoPayload {
	requestId: string;
	ip: string;
	port: number;
	deviceName: string;
	fingerprint: string;
}

interface PeerSocketReadyResponsePayload {
	success: boolean;
	message: string;
}

interface PeerDisconnectedPayload {
	deviceId: string;
	reason: string;
}

interface AckPayload {
	success: boolean;
	message: string;
}

function findConnectionByDeviceSession(deviceSessionId: string | null): IConnection | undefined {
	if (!deviceSessionId) return undefined;

	for (const session of wsSessionManager.getAllSessions()) {
		if (session.session?.id === deviceSessionId) {
			return session;
		}
	}

	for (const session of tcpSessionManager.getAllSessions()) {
		if (session.session?.id === deviceSessionId) {
			return session;
		}
	}

	return undefined;
}

function getConnection(connectionId: string, transport: "TCP" | "WebSocket"): IConnection | undefined {
	if (transport === "WebSocket") {
		return wsSessionManager.getSession(connectionId);
	}
	return tcpSessionManager.getSession(connectionId);
}

function sendJsonPacket<T extends IConnection>(
	client: T,
	packetType: PacketType,
	payload: object,
	requestId?: number,
): void {
	client.sendPacket(
		packetType,
		(w) => {
			w.writeString(JSON.stringify(payload));
		},
		requestId,
	);
}

export function registerPeerHandlers<T extends IConnection>(router: PacketRouter<T>, transportType: TransportType) {
	const handlePeerConnectRequest: CommandHandler<T> = async (client, reader, requestId) => {
		try {
			const rawData = reader.readString();
			const { data, error } = safeJsonParse<PeerConnectRequestPayload>(rawData);

			if (error || !data?.targetDeviceId) {
				throw new Error("Invalid payload: targetDeviceId is required");
			}

			const userId = client.user?.id;
			if (!userId) {
				throw new Error("Unauthorized: User not authenticated");
			}

			const sourceSessionId = client.session?.id;
			if (!sourceSessionId) {
				throw new Error("No session found for source device");
			}

			const sourceDevice = await db.query.device.findFirst({
				where: and(eq(device.sessionId, sourceSessionId), eq(device.userId, userId)),
			});

			if (!sourceDevice) {
				throw new Error("Source device not found or not registered");
			}

			const devices = await db.query.device.findMany({
				where: and(eq(device.userId, userId), inArray(device.id, [data.targetDeviceId])),
			});

			const targetDevice = devices.find((d) => d.id === data.targetDeviceId);

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
				sourceTransport: transportType as "TCP" | "WebSocket",
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
					`Connection attempt rejected: ${sourceDevice.name} -> ${targetDevice.name}: ${result.reason}`,
				);
				return;
			}

			const targetConnection = findConnectionByDeviceSession(targetDevice.sessionId);

			if (!targetConnection) {
				PeerState.markDisconnected(
					sourceDevice.id,
					targetDevice.id,
					PeerState.StateChangeReason.DEVICE_OFFLINE,
				);

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
				`Peer connect: ${sourceDevice.name} -> ${targetDevice.name} (${result.requestId})`,
			);

			const incomingRequest: PeerIncomingRequestPayload = {
				requestId: result.requestId,
				sourceDeviceId: sourceDevice.id,
				sourceDeviceName: sourceDevice.name,
				sourceIp: sourceDevice.ipv4,
			};
			sendJsonPacket(targetConnection, PacketType.PEER_INCOMING_REQUEST, incomingRequest);

			const response: PeerConnectResponsePayload = {
				success: true,
				status: "pending",
				requestId: result.requestId,
				message: "Connection request sent to target device",
			};
			sendJsonPacket(client, PacketType.PEER_CONNECT_RESPONSE, response, requestId);
		} catch (error) {
			const msg = (error as Error).message;
			Logger.error(transportType, `Peer connect request failed: ${msg}`);

			const response: PeerConnectResponsePayload = {
				success: false,
				status: "failed",
				message: msg,
			};
			sendJsonPacket(client, PacketType.PEER_CONNECT_RESPONSE, response, requestId);
		}
	};

	const handlePeerSocketReady: CommandHandler<T> = async (client, reader, requestId) => {
		try {
			const rawData = reader.readString();
			const { data, error } = safeJsonParse<PeerSocketReadyPayload>(rawData);

			if (error || !data?.requestId || !data?.port) {
				throw new Error("Invalid payload: requestId and port are required");
			}

			if (data.port < 1 || data.port > 65535) {
				throw new Error("Invalid port number");
			}

			const conn = PeerState.getConnectionByRequestId(data.requestId);
			if (!conn) {
				throw new Error("No pending request found for this ID");
			}

			const userId = client.user?.id;
			if (!userId) {
				throw new Error("Unauthorized");
			}

			const clientSessionId = client.session?.id;
			const targetDevice = await db.query.device.findFirst({
				where: and(eq(device.sessionId, clientSessionId || ""), eq(device.userId, userId)),
			});

			if (!targetDevice) {
				throw new Error("Device not found");
			}

			if (targetDevice.id !== conn.deviceA && targetDevice.id !== conn.deviceB) {
				throw new Error("Device not part of this connection");
			}

			const updatedConn = PeerState.markTargetAccepted(data.requestId, client.id, data.port);
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

			const peerIp = targetDevice.ipv4;
			if (!peerIp) {
				throw new Error("Target device has no registered IP address");
			}

			Logger.info(transportType, `Peer socket ready: ${targetDevice.name} at ${peerIp}:${data.port}`);

			const connectionInfo: PeerConnectionInfoPayload = {
				requestId: data.requestId,
				ip: peerIp,
				port: data.port,
				deviceName: targetDevice.name,
				fingerprint: targetDevice.fingerprint || "",
			};
			sendJsonPacket(sourceConnection, PacketType.PEER_CONNECTION_INFO, connectionInfo);

			const response: PeerSocketReadyResponsePayload = {
				success: true,
				message: "Connection info relayed to source device",
			};
			sendJsonPacket(client, PacketType.PEER_SOCKET_READY, response, requestId);
		} catch (error) {
			const msg = (error as Error).message;
			Logger.error(transportType, `Peer socket ready failed: ${msg}`);

			const response: PeerSocketReadyResponsePayload = {
				success: false,
				message: msg,
			};
			sendJsonPacket(client, PacketType.PEER_SOCKET_READY, response, requestId);
		}
	};

	const handlePeerConnectionConfirm: CommandHandler<T> = async (client, reader, requestId) => {
		try {
			const rawData = reader.readString();
			const { data, error } = safeJsonParse<PeerConnectionConfirmPayload>(rawData);

			if (error || !data?.requestId) {
				throw new Error("Invalid payload: requestId is required");
			}

			const success = PeerState.markConnected(data.requestId);
			if (!success) {
				throw new Error("Connection not found or already in different state");
			}

			Logger.info(transportType, `P2P connection confirmed: ${data.requestId}`);

			const response: AckPayload = {
				success: true,
				message: "Connection confirmed",
			};
			sendJsonPacket(client, PacketType.ACK, response, requestId);
		} catch (error) {
			const msg = (error as Error).message;
			Logger.error(transportType, `Connection confirm failed: ${msg}`);

			const response: AckPayload = {
				success: false,
				message: msg,
			};
			sendJsonPacket(client, PacketType.ACK, response, requestId);
		}
	};

	const handlePeerDisconnect: CommandHandler<T> = async (client, reader, requestId) => {
		try {
			const rawData = reader.readString();
			const { data, error } = safeJsonParse<PeerDisconnectPayload>(rawData);

			if (error || !data?.targetDeviceId) {
				throw new Error("Invalid payload: targetDeviceId is required");
			}

			const userId = client.user?.id;
			if (!userId) {
				throw new Error("Unauthorized");
			}

			const clientSessionId = client.session?.id;
			const sourceDevice = await db.query.device.findFirst({
				where: and(eq(device.sessionId, clientSessionId || ""), eq(device.userId, userId)),
			});

			if (!sourceDevice) {
				throw new Error("Source device not found");
			}

			const success = PeerState.markDisconnected(
				sourceDevice.id,
				data.targetDeviceId,
				PeerState.StateChangeReason.EXPLICIT_DISCONNECT,
			);

			if (success) {
				Logger.info(transportType, `Peer disconnected: ${sourceDevice.id} <-> ${data.targetDeviceId}`);
			}

			const targetDevice = await db.query.device.findFirst({
				where: eq(device.id, data.targetDeviceId),
			});

			if (targetDevice?.sessionId) {
				const targetConnection = findConnectionByDeviceSession(targetDevice.sessionId);
				if (targetConnection) {
					const notification: PeerDisconnectedPayload = {
						deviceId: sourceDevice.id,
						reason: data.reason || "Peer disconnected",
					};
					sendJsonPacket(targetConnection, PacketType.PEER_DISCONNECTED, notification);
				}
			}

			const response: AckPayload = {
				success: true,
				message: "Disconnected",
			};
			sendJsonPacket(client, PacketType.ACK, response, requestId);
		} catch (error) {
			const msg = (error as Error).message;
			Logger.error(transportType, `Peer disconnect failed: ${msg}`);

			const response: AckPayload = {
				success: false,
				message: msg,
			};
			sendJsonPacket(client, PacketType.ACK, response, requestId);
		}
	};

	router.register(PacketType.PEER_CONNECT_REQUEST, handlePeerConnectRequest);
	router.register(PacketType.PEER_SOCKET_READY, handlePeerSocketReady);
	router.register(PacketType.PEER_CONNECTION_CONFIRM, handlePeerConnectionConfirm);
	router.register(PacketType.PEER_DISCONNECT, handlePeerDisconnect);
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

import { Logger } from "@/infrastructure/logger";
import { getRedisClient } from "@/infrastructure/redis";
import { PacketType } from "@/infrastructure/socket/protocol/packet-type";
import type { IConnection, TransportType } from "@/infrastructure/socket/runtime/types";
import { tcpSessionManager } from "@/infrastructure/socket/transport/tcp/connection";
import { wsSessionManager } from "@/infrastructure/socket/transport/ws/connection";
import { getLocalNodeId, type ConnectionTarget } from "./connection-routing";

type RedisClient = ReturnType<typeof getRedisClient>;

type RelayPacketPayload = {
	sourceNodeId: string;
	targetNodeId: string;
	targetTransport: TransportType;
	targetConnectionId: string;
	packetType: number;
	payloadJson: string;
	requestId?: number;
};

const RELAY_CHANNEL_PREFIX = "nekoshare:routing:relay:";

let initialized = false;
let subscriberClient: RedisClient | null = null;

function getRelayChannel(nodeId: string): string {
	return `${RELAY_CHANNEL_PREFIX}${nodeId}`;
}

function getLocalConnection(connectionId: string, transport: TransportType): IConnection | undefined {
	if (transport === "WebSocket") {
		return wsSessionManager.getSession(connectionId);
	}

	return tcpSessionManager.getSession(connectionId);
}

function parseRelayPayload(raw: string): RelayPacketPayload | undefined {
	try {
		const parsed = JSON.parse(raw) as Partial<RelayPacketPayload>;
		if (
			typeof parsed.sourceNodeId !== "string" ||
			typeof parsed.targetNodeId !== "string" ||
			typeof parsed.targetTransport !== "string" ||
			(parsed.targetTransport !== "TCP" && parsed.targetTransport !== "WebSocket") ||
			typeof parsed.targetConnectionId !== "string" ||
			typeof parsed.packetType !== "number" ||
			typeof parsed.payloadJson !== "string"
		) {
			return undefined;
		}

		return {
			sourceNodeId: parsed.sourceNodeId,
			targetNodeId: parsed.targetNodeId,
			targetTransport: parsed.targetTransport,
			targetConnectionId: parsed.targetConnectionId,
			packetType: parsed.packetType,
			payloadJson: parsed.payloadJson,
			requestId: typeof parsed.requestId === "number" ? parsed.requestId : undefined,
		};
	} catch {
		return undefined;
	}
}

function sendPacket(connection: IConnection, packetType: number, payloadJson: string, requestId?: number): void {
	connection.sendPacket(
		packetType as PacketType,
		(writer) => {
			writer.writeString(payloadJson);
		},
		requestId,
	);
}

function handleRelayPacket(rawMessage: string): void {
	const payload = parseRelayPayload(rawMessage);
	if (!payload) {
		Logger.warn("Routing", "Received malformed relay packet payload");
		return;
	}

	const localNodeId = getLocalNodeId();
	if (payload.targetNodeId !== localNodeId) {
		return;
	}

	const connection = getLocalConnection(payload.targetConnectionId, payload.targetTransport);
	if (!connection) {
		Logger.debug(
			"Routing",
			`Relay target missing: ${payload.targetTransport}:${payload.targetConnectionId} on node ${localNodeId}`,
		);
		return;
	}

	sendPacket(connection, payload.packetType, payload.payloadJson, payload.requestId);
}

export async function initializePacketRelay(): Promise<void> {
	if (initialized) {
		return;
	}

	const redis = getRedisClient();
	const localNodeId = getLocalNodeId();
	const channel = getRelayChannel(localNodeId);

	subscriberClient = redis.duplicate();
	subscriberClient.on("error", (error) => {
		Logger.error("Routing", "Relay subscriber error", error);
	});

	if (!subscriberClient.isOpen) {
		await subscriberClient.connect();
	}

	await subscriberClient.subscribe(channel, handleRelayPacket);
	initialized = true;
	Logger.info("Routing", `Packet relay subscribed: ${channel}`);
}

export async function shutdownPacketRelay(): Promise<void> {
	if (!initialized || !subscriberClient) {
		return;
	}

	const channel = getRelayChannel(getLocalNodeId());

	try {
		await subscriberClient.unsubscribe(channel);
	} finally {
		if (subscriberClient.isOpen) {
			await subscriberClient.quit();
		}
		subscriberClient = null;
		initialized = false;
	}
}

export async function sendJsonPacketToConnectionTarget(
	target: ConnectionTarget,
	packetType: PacketType,
	payloadJson: string,
	requestId?: number,
): Promise<boolean> {
	if (target.kind === "local") {
		sendPacket(target.connection, packetType, payloadJson, requestId);
		return true;
	}

	const relayPayload: RelayPacketPayload = {
		sourceNodeId: getLocalNodeId(),
		targetNodeId: target.nodeId,
		targetTransport: target.transport,
		targetConnectionId: target.connectionId,
		packetType,
		payloadJson,
		requestId,
	};

	try {
		const redis = getRedisClient();
		const channel = getRelayChannel(target.nodeId);
		await redis.publish(channel, JSON.stringify(relayPayload));
		return true;
	} catch (error) {
		Logger.warn(
			"Routing",
			`Failed to publish relay packet to ${target.nodeId}:${target.transport}:${target.connectionId}`,
			error,
		);
		return false;
	}
}

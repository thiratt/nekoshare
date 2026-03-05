import { Logger } from "@/infrastructure/logger";
import { getRedisClient } from "@/infrastructure/redis";
import { PacketType } from "@/infrastructure/socket/protocol/packet-type";
import { wsSessionManager } from "@/infrastructure/socket/transport/ws/connection";

type WsUserEventPayload = {
	sourceNodeId: string;
	targetUserId: string;
	packetType: number;
	payloadJson: string;
	excludeConnectionId?: string;
};

type PublishWsUserEventInput = Omit<WsUserEventPayload, "sourceNodeId">;
type RedisClient = ReturnType<typeof getRedisClient>;

const WS_USER_EVENTS_CHANNEL = "nekoshare:ws:user-events";
const SOURCE_NODE_ID = process.env.NODE_ID?.trim() || `node_${process.pid}_${Math.random().toString(36).slice(2, 8)}`;

let initialized = false;
let subscriberClient: RedisClient | null = null;

function sendToLocalSessions(
	targetUserId: string,
	packetType: number,
	payloadJson: string,
	options?: { excludeConnectionId?: string },
): number {
	const sessions = wsSessionManager.getSessionsByUserId(targetUserId);
	let sent = 0;

	for (const session of sessions) {
		if (options?.excludeConnectionId && session.id === options.excludeConnectionId) {
			continue;
		}

		session.sendPacket(packetType as PacketType, (writer) => writer.writeString(payloadJson));
		sent++;
	}

	return sent;
}

function parseWsUserEventPayload(raw: string): WsUserEventPayload | null {
	try {
		const parsed = JSON.parse(raw) as Partial<WsUserEventPayload>;
		if (
			typeof parsed.sourceNodeId !== "string" ||
			typeof parsed.targetUserId !== "string" ||
			typeof parsed.packetType !== "number" ||
			typeof parsed.payloadJson !== "string"
		) {
			return null;
		}

		return {
			sourceNodeId: parsed.sourceNodeId,
			targetUserId: parsed.targetUserId,
			packetType: parsed.packetType,
			payloadJson: parsed.payloadJson,
			excludeConnectionId: typeof parsed.excludeConnectionId === "string" ? parsed.excludeConnectionId : undefined,
		};
	} catch {
		return null;
	}
}

function handleWsUserEventMessage(rawMessage: string): void {
	const payload = parseWsUserEventPayload(rawMessage);
	if (!payload) {
		Logger.warn("WebSocket", "Received malformed WS pub/sub payload");
		return;
	}

	if (payload.sourceNodeId === SOURCE_NODE_ID) {
		return;
	}

	const sent = sendToLocalSessions(payload.targetUserId, payload.packetType, payload.payloadJson, {
		excludeConnectionId: payload.excludeConnectionId,
	});

	if (sent > 0) {
		Logger.debug(
			"WebSocket",
			`WS pub/sub delivered ${sent} packet(s) to user ${payload.targetUserId} (packetType=${payload.packetType})`,
		);
	}
}

export async function initializeWsPubSub(): Promise<void> {
	if (initialized) {
		return;
	}

	const redis = getRedisClient();
	subscriberClient = redis.duplicate();
	subscriberClient.on("error", (error) => {
		Logger.error("WebSocket", "WS pub/sub subscriber error", error);
	});

	if (!subscriberClient.isOpen) {
		await subscriberClient.connect();
	}

	await subscriberClient.subscribe(WS_USER_EVENTS_CHANNEL, handleWsUserEventMessage);
	initialized = true;
	Logger.info("WebSocket", `WS pub/sub subscribed: ${WS_USER_EVENTS_CHANNEL}`);
}

export async function shutdownWsPubSub(): Promise<void> {
	if (!initialized || !subscriberClient) {
		return;
	}

	try {
		await subscriberClient.unsubscribe(WS_USER_EVENTS_CHANNEL);
	} finally {
		if (subscriberClient.isOpen) {
			await subscriberClient.quit();
		}
		subscriberClient = null;
		initialized = false;
	}
}

export async function publishWsUserEvent(input: PublishWsUserEventInput): Promise<void> {
	try {
		const redis = getRedisClient();
		const payload: WsUserEventPayload = {
			sourceNodeId: SOURCE_NODE_ID,
			targetUserId: input.targetUserId,
			packetType: input.packetType,
			payloadJson: input.payloadJson,
			excludeConnectionId: input.excludeConnectionId,
		};

		await redis.publish(WS_USER_EVENTS_CHANNEL, JSON.stringify(payload));
	} catch (error) {
		Logger.warn("WebSocket", `Failed to publish WS event for user ${input.targetUserId}`, error);
	}
}

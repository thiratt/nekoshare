import { Logger } from "@/infrastructure/logger";
import { getRedisClient } from "@/infrastructure/redis";
import type { IConnection, TransportType } from "@/infrastructure/socket/runtime/types";

const ROUTE_SESSION_PREFIX = "route:session:";
const ROUTE_DEVICE_PREFIX = "route:device:";
const ROUTE_TTL_SECONDS = 90;
const ROUTE_HEARTBEAT_MS = 30_000;
const ROUTE_TOKEN_DELIMITER = "|";
const NODE_ID = process.env.NODE_ID?.trim() || `node_${process.pid}_${Math.random().toString(36).slice(2, 8)}`;

const COMPARE_AND_DELETE_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
	return redis.call("DEL", KEYS[1])
else
	return 0
end
`;

type RouteRecord = {
	connectionId: string;
	transport: TransportType;
	sessionId: string;
	deviceId?: string;
	token: string;
};

type ParsedRouteToken = {
	nodeId: string;
	transport: TransportType;
	connectionId: string;
};

export type ConnectionTarget =
	| {
			kind: "local";
			nodeId: string;
			transport: TransportType;
			connectionId: string;
			connection: IConnection;
	  }
	| {
			kind: "remote";
			nodeId: string;
			transport: TransportType;
			connectionId: string;
	  };

const routeRecordsByConnectionId = new Map<string, RouteRecord>();
const localConnectionById = new Map<string, IConnection>();
const localConnectionIdBySessionId = new Map<string, string>();
const localConnectionIdByDeviceId = new Map<string, string>();

let heartbeatTimer: NodeJS.Timeout | null = null;

function getSessionRouteKey(sessionId: string): string {
	return `${ROUTE_SESSION_PREFIX}${sessionId}`;
}

function getDeviceRouteKey(deviceId: string): string {
	return `${ROUTE_DEVICE_PREFIX}${deviceId}`;
}

function encodeRouteToken(connectionId: string, transport: TransportType): string {
	return `${NODE_ID}${ROUTE_TOKEN_DELIMITER}${transport}${ROUTE_TOKEN_DELIMITER}${connectionId}`;
}

function parseRouteToken(token: string | null): ParsedRouteToken | undefined {
	if (!token) {
		return undefined;
	}

	const [nodeId, transportRaw, connectionId] = token.split(ROUTE_TOKEN_DELIMITER);
	if (!nodeId || !transportRaw || !connectionId) {
		return undefined;
	}

	if (transportRaw !== "TCP" && transportRaw !== "WebSocket") {
		return undefined;
	}

	return {
		nodeId,
		transport: transportRaw,
		connectionId,
	};
}

function getConnectionDeviceId(connection: IConnection): string | undefined {
	const user = connection.user as { deviceId?: string | null } | null;
	const deviceId = user?.deviceId?.trim();
	return deviceId ? deviceId : undefined;
}

async function compareAndDelete(key: string, expectedValue: string): Promise<void> {
	const redis = getRedisClient();
	try {
		await redis.eval(COMPARE_AND_DELETE_SCRIPT, {
			keys: [key],
			arguments: [expectedValue],
		});
	} catch (error) {
		Logger.warn("Routing", `Failed to remove routing key ${key}`, error);
	}
}

function removeFromLocalMaps(routeRecord: RouteRecord): void {
	localConnectionById.delete(routeRecord.connectionId);
	localConnectionIdBySessionId.delete(routeRecord.sessionId);
	if (routeRecord.deviceId) {
		localConnectionIdByDeviceId.delete(routeRecord.deviceId);
	}
}

function startHeartbeatIfNeeded(): void {
	if (heartbeatTimer || routeRecordsByConnectionId.size === 0) {
		return;
	}

	heartbeatTimer = setInterval(() => {
		void refreshLocalRoutes();
	}, ROUTE_HEARTBEAT_MS);
	heartbeatTimer.unref?.();
}

function stopHeartbeatIfNeeded(): void {
	if (routeRecordsByConnectionId.size > 0 || !heartbeatTimer) {
		return;
	}

	clearInterval(heartbeatTimer);
	heartbeatTimer = null;
}

async function refreshLocalRoutes(): Promise<void> {
	if (routeRecordsByConnectionId.size === 0) {
		return;
	}

	const redis = getRedisClient();
	for (const routeRecord of routeRecordsByConnectionId.values()) {
		try {
			const tx = redis
				.multi()
				.set(getSessionRouteKey(routeRecord.sessionId), routeRecord.token, {
					EX: ROUTE_TTL_SECONDS,
				});

			if (routeRecord.deviceId) {
				tx.set(getDeviceRouteKey(routeRecord.deviceId), routeRecord.token, {
					EX: ROUTE_TTL_SECONDS,
				});
			}

			await tx.exec();
		} catch (error) {
			Logger.warn(
				"Routing",
				`Failed to refresh routing entry for connection ${routeRecord.connectionId}`,
				error,
			);
		}
	}
}

async function upsertRouteRecord(routeRecord: RouteRecord): Promise<void> {
	const redis = getRedisClient();
	const tx = redis
		.multi()
		.set(getSessionRouteKey(routeRecord.sessionId), routeRecord.token, {
			EX: ROUTE_TTL_SECONDS,
		});

	if (routeRecord.deviceId) {
		tx.set(getDeviceRouteKey(routeRecord.deviceId), routeRecord.token, {
			EX: ROUTE_TTL_SECONDS,
		});
	}

	await tx.exec();
}

export async function registerConnectionRoute(connection: IConnection): Promise<void> {
	const sessionId = connection.session?.id?.trim();
	if (!sessionId) {
		return;
	}

	const existingRecord = routeRecordsByConnectionId.get(connection.id);
	if (existingRecord) {
		await unregisterConnectionRoute(connection.id);
	}

	const routeRecord: RouteRecord = {
		connectionId: connection.id,
		transport: connection.transportType,
		sessionId,
		deviceId: getConnectionDeviceId(connection),
		token: encodeRouteToken(connection.id, connection.transportType),
	};

	routeRecordsByConnectionId.set(connection.id, routeRecord);
	localConnectionById.set(connection.id, connection);
	localConnectionIdBySessionId.set(routeRecord.sessionId, routeRecord.connectionId);
	if (routeRecord.deviceId) {
		localConnectionIdByDeviceId.set(routeRecord.deviceId, routeRecord.connectionId);
	}
	startHeartbeatIfNeeded();

	try {
		await upsertRouteRecord(routeRecord);
	} catch (error) {
		Logger.warn("Routing", `Failed to register connection route for ${connection.id}`, error);
	}
}

export async function unregisterConnectionRoute(connectionId: string): Promise<void> {
	const routeRecord = routeRecordsByConnectionId.get(connectionId);
	if (!routeRecord) {
		return;
	}

	routeRecordsByConnectionId.delete(connectionId);
	removeFromLocalMaps(routeRecord);
	stopHeartbeatIfNeeded();

	await compareAndDelete(getSessionRouteKey(routeRecord.sessionId), routeRecord.token);
	if (routeRecord.deviceId) {
		await compareAndDelete(getDeviceRouteKey(routeRecord.deviceId), routeRecord.token);
	}
}

function getLocalConnectionByConnectionId(connectionId: string): IConnection | undefined {
	const localConnection = localConnectionById.get(connectionId);
	if (!localConnection) {
		return undefined;
	}

	return localConnection;
}

function toLocalTarget(parsed: ParsedRouteToken, connection: IConnection): ConnectionTarget {
	return {
		kind: "local",
		nodeId: parsed.nodeId,
		transport: parsed.transport,
		connectionId: parsed.connectionId,
		connection,
	};
}

function toRemoteTarget(parsed: ParsedRouteToken): ConnectionTarget {
	return {
		kind: "remote",
		nodeId: parsed.nodeId,
		transport: parsed.transport,
		connectionId: parsed.connectionId,
	};
}

async function resolveTargetByRouteKey(routeKey: string): Promise<ConnectionTarget | undefined> {
	const redis = getRedisClient();
	const routeToken = await redis.get(routeKey);
	const parsed = parseRouteToken(routeToken);
	if (!parsed) {
		return undefined;
	}

	if (parsed.nodeId !== NODE_ID) {
		return toRemoteTarget(parsed);
	}

	const localConnection = getLocalConnectionByConnectionId(parsed.connectionId);
	if (localConnection) {
		return toLocalTarget(parsed, localConnection);
	}

	if (routeToken) {
		await compareAndDelete(routeKey, routeToken);
	}
	return undefined;
}

export async function resolveConnectionTargetBySessionId(sessionId: string | null): Promise<ConnectionTarget | undefined> {
	const normalizedSessionId = sessionId?.trim();
	if (!normalizedSessionId) {
		return undefined;
	}

	const localConnectionId = localConnectionIdBySessionId.get(normalizedSessionId);
	if (localConnectionId) {
		const localConnection = getLocalConnectionByConnectionId(localConnectionId);
		if (localConnection) {
			return {
				kind: "local",
				nodeId: NODE_ID,
				transport: localConnection.transportType,
				connectionId: localConnection.id,
				connection: localConnection,
			};
		}

		localConnectionIdBySessionId.delete(normalizedSessionId);
	}

	return resolveTargetByRouteKey(getSessionRouteKey(normalizedSessionId));
}

export async function resolveConnectionTargetByDeviceId(deviceId: string | null): Promise<ConnectionTarget | undefined> {
	const normalizedDeviceId = deviceId?.trim();
	if (!normalizedDeviceId) {
		return undefined;
	}

	const localConnectionId = localConnectionIdByDeviceId.get(normalizedDeviceId);
	if (localConnectionId) {
		const localConnection = getLocalConnectionByConnectionId(localConnectionId);
		if (localConnection) {
			return {
				kind: "local",
				nodeId: NODE_ID,
				transport: localConnection.transportType,
				connectionId: localConnection.id,
				connection: localConnection,
			};
		}

		localConnectionIdByDeviceId.delete(normalizedDeviceId);
	}

	return resolveTargetByRouteKey(getDeviceRouteKey(normalizedDeviceId));
}

export async function resolveConnectionBySessionId(sessionId: string | null): Promise<IConnection | undefined> {
	const target = await resolveConnectionTargetBySessionId(sessionId);
	return target?.kind === "local" ? target.connection : undefined;
}

export async function resolveConnectionByDeviceId(deviceId: string | null): Promise<IConnection | undefined> {
	const target = await resolveConnectionTargetByDeviceId(deviceId);
	return target?.kind === "local" ? target.connection : undefined;
}

export function getLocalNodeId(): string {
	return NODE_ID;
}

export async function shutdownConnectionRouting(): Promise<void> {
	const routeRecords = Array.from(routeRecordsByConnectionId.values());
	routeRecordsByConnectionId.clear();
	localConnectionById.clear();
	localConnectionIdBySessionId.clear();
	localConnectionIdByDeviceId.clear();

	if (heartbeatTimer) {
		clearInterval(heartbeatTimer);
		heartbeatTimer = null;
	}

	for (const routeRecord of routeRecords) {
		await compareAndDelete(getSessionRouteKey(routeRecord.sessionId), routeRecord.token);
		if (routeRecord.deviceId) {
			await compareAndDelete(getDeviceRouteKey(routeRecord.deviceId), routeRecord.token);
		}
	}
}

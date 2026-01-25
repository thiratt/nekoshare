import { Logger } from "@/core/logger";

export enum PeerConnectionState {
	PENDING = "PENDING",
	IN_PROGRESS = "IN_PROGRESS",
	CONNECTED = "CONNECTED",
	DISCONNECTED = "DISCONNECTED",
}

export enum StateChangeReason {
	REQUEST_INITIATED = "REQUEST_INITIATED",
	TARGET_ACCEPTED = "TARGET_ACCEPTED",
	CONNECTION_STARTED = "CONNECTION_STARTED",
	EXPLICIT_DISCONNECT = "EXPLICIT_DISCONNECT",
	TIMEOUT = "TIMEOUT",
	FAILURE = "FAILURE",
	REPLACED = "REPLACED",
	DEVICE_OFFLINE = "DEVICE_OFFLINE",
}

export interface PeerConnectionInfo {
	pairId: string;
	deviceA: string;
	deviceB: string;
	initiator: string;
	state: PeerConnectionState;
	requestId: string;
	createdAt: number;
	updatedAt: number;
	lastChangeReason: StateChangeReason;
	sourceConnectionId: string;
	sourceTransport: "TCP" | "WebSocket";
	targetConnectionId?: string;
	targetPort?: number;
}

export interface ConnectionRequest {
	sourceDeviceId: string;
	targetDeviceId: string;
	requestId: string;
	sourceConnectionId: string;
	sourceTransport: "TCP" | "WebSocket";
}

export type ConnectionAttemptResult =
	| { success: true; requestId: string; isNew: boolean }
	| { success: false; reason: string; existingRequestId?: string };

const CONFIG = {
	PENDING_TIMEOUT_MS: 60 * 1000,
	IN_PROGRESS_TIMEOUT_MS: 30 * 1000,
	CONNECTED_TIMEOUT_MS: 5 * 60 * 1000,
	RATE_LIMIT_MS: 1000,
	CLEANUP_INTERVAL_MS: 30 * 1000,
};

const connections = new Map<string, PeerConnectionInfo>();
const rateLimitMap = new Map<string, number>();
const pairLocks = new Map<string, boolean>();

export function getPairId(deviceA: string, deviceB: string): string {
	return deviceA < deviceB ? `${deviceA}:${deviceB}` : `${deviceB}:${deviceA}`;
}

export function generateRequestId(): string {
	return `peer_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

function acquireLock(pairId: string): boolean {
	if (pairLocks.get(pairId)) {
		return false;
	}
	pairLocks.set(pairId, true);
	return true;
}

function releaseLock(pairId: string): void {
	pairLocks.delete(pairId);
}

function isActiveState(state: PeerConnectionState): boolean {
	return state !== PeerConnectionState.DISCONNECTED;
}

function getTimeoutForState(state: PeerConnectionState): number {
	switch (state) {
		case PeerConnectionState.PENDING:
			return CONFIG.PENDING_TIMEOUT_MS;
		case PeerConnectionState.IN_PROGRESS:
			return CONFIG.IN_PROGRESS_TIMEOUT_MS;
		case PeerConnectionState.CONNECTED:
			return CONFIG.CONNECTED_TIMEOUT_MS;
		default:
			return 0;
	}
}

function isExpired(conn: PeerConnectionInfo): boolean {
	const timeout = getTimeoutForState(conn.state);
	return Date.now() - conn.updatedAt > timeout;
}

export function attemptConnection(request: ConnectionRequest): ConnectionAttemptResult {
	const { sourceDeviceId, targetDeviceId, sourceConnectionId, sourceTransport } = request;
	const pairId = getPairId(sourceDeviceId, targetDeviceId);
	const now = Date.now();

	const lastRequest = rateLimitMap.get(sourceDeviceId);
	if (lastRequest && now - lastRequest < CONFIG.RATE_LIMIT_MS) {
		return {
			success: false,
			reason: "Rate limited: Please wait before sending another request",
		};
	}
	rateLimitMap.set(sourceDeviceId, now);

	if (!acquireLock(pairId)) {
		return {
			success: false,
			reason: "Another connection operation is in progress for this device pair",
		};
	}

	try {
		const existing = connections.get(pairId);

		if (existing) {
			if (isActiveState(existing.state) && !isExpired(existing)) {
				Logger.info(
					"PEER_STATE",
					`Duplicate request for pair ${pairId}: existing connection in state ${existing.state}`,
				);

				return {
					success: false,
					reason: `Connection already ${existing.state.toLowerCase()}`,
					existingRequestId: existing.requestId,
				};
			}

			Logger.info("PEER_STATE", `Replacing expired/disconnected connection for pair ${pairId}`);
			connections.delete(pairId);
		}

		const requestId = generateRequestId();
		const connection: PeerConnectionInfo = {
			pairId,
			deviceA: sourceDeviceId < targetDeviceId ? sourceDeviceId : targetDeviceId,
			deviceB: sourceDeviceId < targetDeviceId ? targetDeviceId : sourceDeviceId,
			initiator: sourceDeviceId,
			state: PeerConnectionState.PENDING,
			requestId,
			createdAt: now,
			updatedAt: now,
			lastChangeReason: StateChangeReason.REQUEST_INITIATED,
			sourceConnectionId,
			sourceTransport,
		};

		connections.set(pairId, connection);

		Logger.info("PEER_STATE", `Created new connection: ${pairId} (${requestId})`);

		return { success: true, requestId, isNew: true };
	} finally {
		releaseLock(pairId);
	}
}

export function getConnectionByPair(deviceA: string, deviceB: string): PeerConnectionInfo | undefined {
	const pairId = getPairId(deviceA, deviceB);
	const conn = connections.get(pairId);

	if (conn && isActiveState(conn.state) && !isExpired(conn)) {
		return conn;
	}

	return undefined;
}

export function getConnectionByRequestId(requestId: string): PeerConnectionInfo | undefined {
	for (const conn of connections.values()) {
		if (conn.requestId === requestId) {
			if (isActiveState(conn.state) && !isExpired(conn)) {
				return conn;
			}
			connections.delete(conn.pairId);
			return undefined;
		}
	}
	return undefined;
}

export function markTargetAccepted(
	requestId: string,
	targetConnectionId: string,
	targetPort: number,
): PeerConnectionInfo | null {
	const conn = getConnectionByRequestId(requestId);
	if (!conn) {
		Logger.warn("PEER_STATE", `Cannot mark accepted: request ${requestId} not found`);
		return null;
	}

	if (conn.state !== PeerConnectionState.PENDING) {
		Logger.warn("PEER_STATE", `Cannot mark accepted: request ${requestId} in state ${conn.state}`);
		return null;
	}

	conn.state = PeerConnectionState.IN_PROGRESS;
	conn.lastChangeReason = StateChangeReason.TARGET_ACCEPTED;
	conn.updatedAt = Date.now();
	conn.targetConnectionId = targetConnectionId;
	conn.targetPort = targetPort;

	Logger.info("PEER_STATE", `Connection ${requestId} marked IN_PROGRESS`);

	return conn;
}

export function markConnected(requestId: string): boolean {
	const conn = getConnectionByRequestId(requestId);
	if (!conn) {
		Logger.warn("PEER_STATE", `Cannot mark connected: request ${requestId} not found`);
		return false;
	}

	conn.state = PeerConnectionState.CONNECTED;
	conn.lastChangeReason = StateChangeReason.CONNECTION_STARTED;
	conn.updatedAt = Date.now();

	Logger.info("PEER_STATE", `Connection ${requestId} marked CONNECTED`);

	return true;
}

export function markDisconnected(
	deviceA: string,
	deviceB: string,
	reason: StateChangeReason = StateChangeReason.EXPLICIT_DISCONNECT,
): boolean {
	const pairId = getPairId(deviceA, deviceB);
	const conn = connections.get(pairId);

	if (!conn) {
		return false;
	}

	conn.state = PeerConnectionState.DISCONNECTED;
	conn.lastChangeReason = reason;
	conn.updatedAt = Date.now();

	Logger.info("PEER_STATE", `Connection ${conn.requestId} marked DISCONNECTED (${reason})`);

	setTimeout(() => {
		const current = connections.get(pairId);
		if (current && current.state === PeerConnectionState.DISCONNECTED) {
			connections.delete(pairId);
			Logger.debug("PEER_STATE", `Cleaned up disconnected connection: ${pairId}`);
		}
	}, 5000);

	return true;
}

export function handleDeviceDisconnect(deviceId: string): number {
	let count = 0;

	for (const conn of connections.values()) {
		if ((conn.deviceA === deviceId || conn.deviceB === deviceId) && isActiveState(conn.state)) {
			conn.state = PeerConnectionState.DISCONNECTED;
			conn.lastChangeReason = StateChangeReason.DEVICE_OFFLINE;
			conn.updatedAt = Date.now();
			count++;
		}
	}

	if (count > 0) {
		Logger.info("PEER_STATE", `Marked ${count} connections as disconnected for device ${deviceId}`);
	}

	return count;
}

export function getActiveConnectionsForDevice(deviceId: string): PeerConnectionInfo[] {
	const result: PeerConnectionInfo[] = [];

	for (const conn of connections.values()) {
		if ((conn.deviceA === deviceId || conn.deviceB === deviceId) && isActiveState(conn.state) && !isExpired(conn)) {
			result.push(conn);
		}
	}

	return result;
}

export function hasActiveConnection(deviceA: string, deviceB: string): boolean {
	const conn = getConnectionByPair(deviceA, deviceB);
	return conn !== undefined && isActiveState(conn.state);
}

export function getStats(): {
	total: number;
	pending: number;
	inProgress: number;
	connected: number;
	disconnected: number;
} {
	let pending = 0;
	let inProgress = 0;
	let connected = 0;
	let disconnected = 0;

	for (const conn of connections.values()) {
		switch (conn.state) {
			case PeerConnectionState.PENDING:
				pending++;
				break;
			case PeerConnectionState.IN_PROGRESS:
				inProgress++;
				break;
			case PeerConnectionState.CONNECTED:
				connected++;
				break;
			case PeerConnectionState.DISCONNECTED:
				disconnected++;
				break;
		}
	}

	return {
		total: connections.size,
		pending,
		inProgress,
		connected,
		disconnected,
	};
}

function cleanup(): void {
	const now = Date.now();
	let cleanedConnections = 0;
	let cleanedRateLimits = 0;

	for (const [pairId, conn] of connections.entries()) {
		if (isExpired(conn)) {
			if (isActiveState(conn.state)) {
				conn.state = PeerConnectionState.DISCONNECTED;
				conn.lastChangeReason = StateChangeReason.TIMEOUT;
				conn.updatedAt = now;
				Logger.debug("PEER_STATE", `Connection ${pairId} timed out`);
			}
			connections.delete(pairId);
			cleanedConnections++;
		} else if (conn.state === PeerConnectionState.DISCONNECTED) {
			connections.delete(pairId);
			cleanedConnections++;
		}
	}

	for (const [deviceId, timestamp] of rateLimitMap.entries()) {
		if (now - timestamp > 60000) {
			rateLimitMap.delete(deviceId);
			cleanedRateLimits++;
		}
	}

	if (cleanedConnections > 0 || cleanedRateLimits > 0) {
		Logger.debug(
			"PEER_STATE",
			`Cleanup: ${cleanedConnections} connections, ${cleanedRateLimits} rate limits. Active: ${connections.size}`,
		);
	}
}

setInterval(cleanup, CONFIG.CLEANUP_INTERVAL_MS);

setInterval(() => {
	const stats = getStats();
	if (stats.total > 0) {
		Logger.debug(
			"PEER_STATE",
			`Stats: ${stats.total} total (${stats.pending} pending, ${stats.inProgress} in-progress, ${stats.connected} connected)`,
		);
	}
}, 60000);

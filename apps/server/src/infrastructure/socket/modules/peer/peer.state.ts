import { Logger } from "@/infrastructure/logger";
import { acquireLock, getRedisClient, releaseLock } from "@/infrastructure/redis";

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
	DISCONNECTED_TTL_MS: 5 * 1000,
	RATE_LIMIT_MS: 1000,
	LOCK_TTL_MS: 3000,
};

const DEVICE_INDEX_TTL_SECONDS = 24 * 60 * 60;
const PEER_PAIR_PREFIX = "peer:pair:";
const PEER_REQUEST_PREFIX = "peer:request:";
const PEER_DEVICE_PAIRS_PREFIX = "peer:device:pairs:";
const PEER_RATE_LIMIT_PREFIX = "peer:rate:";
const PEER_LOCK_PREFIX = "peer:lock:";

export function getPairId(deviceA: string, deviceB: string): string {
	return deviceA < deviceB ? `${deviceA}:${deviceB}` : `${deviceB}:${deviceA}`;
}

export function generateRequestId(): string {
	return `peer_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

function getPairKey(pairId: string): string {
	return `${PEER_PAIR_PREFIX}${pairId}`;
}

function getRequestKey(requestId: string): string {
	return `${PEER_REQUEST_PREFIX}${requestId}`;
}

function getDevicePairsKey(deviceId: string): string {
	return `${PEER_DEVICE_PAIRS_PREFIX}${deviceId}`;
}

function getRateLimitKey(deviceId: string): string {
	return `${PEER_RATE_LIMIT_PREFIX}${deviceId}`;
}

function getPairLockKey(pairId: string): string {
	return `${PEER_LOCK_PREFIX}${pairId}`;
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

function getTtlForStateMs(state: PeerConnectionState): number {
	if (state === PeerConnectionState.DISCONNECTED) {
		return CONFIG.DISCONNECTED_TTL_MS;
	}

	return getTimeoutForState(state);
}

function isExpired(conn: PeerConnectionInfo, now: number = Date.now()): boolean {
	const timeout = getTimeoutForState(conn.state);
	return timeout > 0 && now - conn.updatedAt > timeout;
}

function parseConnection(raw: string | null): PeerConnectionInfo | undefined {
	if (!raw) {
		return undefined;
	}

	try {
		const parsed = JSON.parse(raw) as PeerConnectionInfo;
		if (!parsed?.pairId || !parsed?.requestId || !parsed?.deviceA || !parsed?.deviceB || !parsed?.state) {
			return undefined;
		}
		return parsed;
	} catch {
		return undefined;
	}
}

async function saveConnection(conn: PeerConnectionInfo): Promise<void> {
	const redis = getRedisClient();
	const ttlMs = Math.max(1000, getTtlForStateMs(conn.state));
	const pairKey = getPairKey(conn.pairId);
	const requestKey = getRequestKey(conn.requestId);
	const deviceAKey = getDevicePairsKey(conn.deviceA);
	const deviceBKey = getDevicePairsKey(conn.deviceB);

	await redis
		.multi()
		.set(pairKey, JSON.stringify(conn), {
			PX: ttlMs,
		})
		.set(requestKey, conn.pairId, {
			PX: ttlMs,
		})
		.sAdd(deviceAKey, conn.pairId)
		.sAdd(deviceBKey, conn.pairId)
		.expire(deviceAKey, DEVICE_INDEX_TTL_SECONDS)
		.expire(deviceBKey, DEVICE_INDEX_TTL_SECONDS)
		.exec();
}

async function removeConnection(conn: PeerConnectionInfo): Promise<void> {
	const redis = getRedisClient();
	await redis
		.multi()
		.del(getPairKey(conn.pairId))
		.del(getRequestKey(conn.requestId))
		.sRem(getDevicePairsKey(conn.deviceA), conn.pairId)
		.sRem(getDevicePairsKey(conn.deviceB), conn.pairId)
		.exec();
}

async function getConnectionByPairId(pairId: string): Promise<PeerConnectionInfo | undefined> {
	const redis = getRedisClient();
	const raw = await redis.get(getPairKey(pairId));
	const conn = parseConnection(raw);
	if (!conn) {
		return undefined;
	}

	if (isExpired(conn)) {
		await removeConnection(conn);
		return undefined;
	}

	return conn;
}

async function getConnectionByRequestIdInternal(requestId: string): Promise<PeerConnectionInfo | undefined> {
	const redis = getRedisClient();
	const pairId = await redis.get(getRequestKey(requestId));
	if (!pairId) {
		return undefined;
	}

	const conn = await getConnectionByPairId(pairId);
	if (!conn || conn.requestId !== requestId) {
		await redis.del(getRequestKey(requestId));
		return undefined;
	}

	return conn;
}

export async function attemptConnection(request: ConnectionRequest): Promise<ConnectionAttemptResult> {
	const { sourceDeviceId, targetDeviceId, sourceConnectionId, sourceTransport } = request;
	const pairId = getPairId(sourceDeviceId, targetDeviceId);
	const now = Date.now();
	const redis = getRedisClient();

	const rateLimitResult = await redis.set(getRateLimitKey(sourceDeviceId), String(now), {
		NX: true,
		PX: CONFIG.RATE_LIMIT_MS,
	});
	if (rateLimitResult !== "OK") {
		return {
			success: false,
			reason: "Rate limited: Please wait before sending another request",
		};
	}

	const lock = await acquireLock(getPairLockKey(pairId), CONFIG.LOCK_TTL_MS);
	if (!lock) {
		return {
			success: false,
			reason: "Another connection operation is in progress for this device pair",
		};
	}

	try {
		const existing = await getConnectionByPairId(pairId);

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
			await removeConnection(existing);
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

		await saveConnection(connection);

		Logger.info("PEER_STATE", `Created new connection: ${pairId} (${requestId})`);

		return { success: true, requestId, isNew: true };
	} finally {
		await releaseLock(lock);
	}
}

export async function getConnectionByPair(deviceA: string, deviceB: string): Promise<PeerConnectionInfo | undefined> {
	const pairId = getPairId(deviceA, deviceB);
	const conn = await getConnectionByPairId(pairId);
	if (!conn) {
		return undefined;
	}

	if (isActiveState(conn.state) && !isExpired(conn)) {
		return conn;
	}

	await removeConnection(conn);
	return undefined;
}

export async function getConnectionByRequestId(requestId: string): Promise<PeerConnectionInfo | undefined> {
	const conn = await getConnectionByRequestIdInternal(requestId);
	if (!conn) {
		return undefined;
	}

	if (isActiveState(conn.state) && !isExpired(conn)) {
		return conn;
	}

	await removeConnection(conn);
	return undefined;
}

export async function markTargetAccepted(
	requestId: string,
	targetConnectionId: string,
	targetPort: number,
): Promise<PeerConnectionInfo | null> {
	const conn = await getConnectionByRequestId(requestId);
	if (!conn) {
		Logger.warn("PEER_STATE", `Cannot mark accepted: request ${requestId} not found`);
		return null;
	}

	const lock = await acquireLock(getPairLockKey(conn.pairId), CONFIG.LOCK_TTL_MS);
	if (!lock) {
		Logger.warn("PEER_STATE", `Cannot mark accepted: lock busy for pair ${conn.pairId}`);
		return null;
	}

	try {
		const current = await getConnectionByPairId(conn.pairId);
		if (!current || current.requestId !== requestId) {
			Logger.warn("PEER_STATE", `Cannot mark accepted: request ${requestId} not found`);
			return null;
		}

		if (current.state !== PeerConnectionState.PENDING) {
			Logger.warn("PEER_STATE", `Cannot mark accepted: request ${requestId} in state ${current.state}`);
			return null;
		}

		const updated: PeerConnectionInfo = {
			...current,
			state: PeerConnectionState.IN_PROGRESS,
			lastChangeReason: StateChangeReason.TARGET_ACCEPTED,
			updatedAt: Date.now(),
			targetConnectionId,
			targetPort,
		};
		await saveConnection(updated);

		Logger.info("PEER_STATE", `Connection ${requestId} marked IN_PROGRESS`);
		return updated;
	} finally {
		await releaseLock(lock);
	}
}

export async function markConnected(requestId: string): Promise<boolean> {
	const conn = await getConnectionByRequestId(requestId);
	if (!conn) {
		Logger.warn("PEER_STATE", `Cannot mark connected: request ${requestId} not found`);
		return false;
	}

	const lock = await acquireLock(getPairLockKey(conn.pairId), CONFIG.LOCK_TTL_MS);
	if (!lock) {
		Logger.warn("PEER_STATE", `Cannot mark connected: lock busy for pair ${conn.pairId}`);
		return false;
	}

	try {
		const current = await getConnectionByPairId(conn.pairId);
		if (!current || current.requestId !== requestId) {
			Logger.warn("PEER_STATE", `Cannot mark connected: request ${requestId} not found`);
			return false;
		}

		const updated: PeerConnectionInfo = {
			...current,
			state: PeerConnectionState.CONNECTED,
			lastChangeReason: StateChangeReason.CONNECTION_STARTED,
			updatedAt: Date.now(),
		};
		await saveConnection(updated);

		Logger.info("PEER_STATE", `Connection ${requestId} marked CONNECTED`);
		return true;
	} finally {
		await releaseLock(lock);
	}
}

export async function markDisconnected(
	deviceA: string,
	deviceB: string,
	reason: StateChangeReason = StateChangeReason.EXPLICIT_DISCONNECT,
): Promise<boolean> {
	const pairId = getPairId(deviceA, deviceB);
	const lock = await acquireLock(getPairLockKey(pairId), CONFIG.LOCK_TTL_MS);
	if (!lock) {
		return false;
	}

	try {
		const conn = await getConnectionByPairId(pairId);
		if (!conn) {
			return false;
		}

		const updated: PeerConnectionInfo = {
			...conn,
			state: PeerConnectionState.DISCONNECTED,
			lastChangeReason: reason,
			updatedAt: Date.now(),
		};

		await saveConnection(updated);
		Logger.info("PEER_STATE", `Connection ${updated.requestId} marked DISCONNECTED (${reason})`);
		return true;
	} finally {
		await releaseLock(lock);
	}
}

export async function handleDeviceDisconnect(deviceId: string): Promise<number> {
	const redis = getRedisClient();
	const pairIds = await redis.sMembers(getDevicePairsKey(deviceId));
	let count = 0;

	for (const pairId of pairIds) {
		const lock = await acquireLock(getPairLockKey(pairId), CONFIG.LOCK_TTL_MS);
		if (!lock) {
			continue;
		}

		try {
			const conn = await getConnectionByPairId(pairId);
			if (!conn) {
				await redis.sRem(getDevicePairsKey(deviceId), pairId);
				continue;
			}

			const isParticipant = conn.deviceA === deviceId || conn.deviceB === deviceId;
			if (!isParticipant) {
				await redis.sRem(getDevicePairsKey(deviceId), pairId);
				continue;
			}

			if (!isActiveState(conn.state)) {
				continue;
			}

			const updated: PeerConnectionInfo = {
				...conn,
				state: PeerConnectionState.DISCONNECTED,
				lastChangeReason: StateChangeReason.DEVICE_OFFLINE,
				updatedAt: Date.now(),
			};
			await saveConnection(updated);
			count++;
		} finally {
			await releaseLock(lock);
		}
	}

	if (count > 0) {
		Logger.info("PEER_STATE", `Marked ${count} connections as disconnected for device ${deviceId}`);
	}

	return count;
}

export async function getActiveConnectionsForDevice(deviceId: string): Promise<PeerConnectionInfo[]> {
	const redis = getRedisClient();
	const pairIds = await redis.sMembers(getDevicePairsKey(deviceId));
	const result: PeerConnectionInfo[] = [];

	for (const pairId of pairIds) {
		const conn = await getConnectionByPairId(pairId);
		if (!conn) {
			await redis.sRem(getDevicePairsKey(deviceId), pairId);
			continue;
		}

		const isParticipant = conn.deviceA === deviceId || conn.deviceB === deviceId;
		if (!isParticipant) {
			await redis.sRem(getDevicePairsKey(deviceId), pairId);
			continue;
		}

		if (isActiveState(conn.state) && !isExpired(conn)) {
			result.push(conn);
			continue;
		}

		await removeConnection(conn);
	}

	return result;
}

export async function hasActiveConnection(deviceA: string, deviceB: string): Promise<boolean> {
	const conn = await getConnectionByPair(deviceA, deviceB);
	return conn !== undefined && isActiveState(conn.state);
}

export async function getStats(): Promise<{
	total: number;
	pending: number;
	inProgress: number;
	connected: number;
	disconnected: number;
}> {
	const redis = getRedisClient();
	let cursor = "0";
	const keys: string[] = [];

	do {
		const scanResult = await redis.scan(cursor, {
			MATCH: `${PEER_PAIR_PREFIX}*`,
			COUNT: 100,
		});
		cursor = String(scanResult.cursor);
		keys.push(...scanResult.keys);
	} while (cursor !== "0");

	let pending = 0;
	let inProgress = 0;
	let connected = 0;
	let disconnected = 0;

	for (const key of keys) {
		const conn = parseConnection(await redis.get(key));
		if (!conn) {
			await redis.del(key);
			continue;
		}

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
		total: pending + inProgress + connected + disconnected,
		pending,
		inProgress,
		connected,
		disconnected,
	};
}

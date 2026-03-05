import { acquireLock, getRedisClient, releaseLock } from "@/infrastructure/redis";
import { safeJsonParse } from "@/shared/utils/json-helper";

type TransferSessionState = "offered" | "accepted";

export interface TransferSessionRecord {
	transferId: string;
	senderDeviceId: string;
	receiverDeviceId: string;
	state: TransferSessionState;
	updatedAt: number;
}

const TRANSFER_SESSION_TTL_SECONDS = 30 * 60;
const TRANSFER_LOCK_TTL_MS = 3000;
const TRANSFER_SESSION_PREFIX = "transfer:session:";
const TRANSFER_PAIR_ACCEPTED_PREFIX = "transfer:pair:accepted:";
const TRANSFER_LOCK_PREFIX = "transfer:lock:";

function getTransferSessionKey(transferId: string): string {
	return `${TRANSFER_SESSION_PREFIX}${transferId}`;
}

function getTransferLockKey(transferId: string): string {
	return `${TRANSFER_LOCK_PREFIX}${transferId}`;
}

function getTransferPairId(deviceA: string, deviceB: string): string {
	return deviceA < deviceB ? `${deviceA}:${deviceB}` : `${deviceB}:${deviceA}`;
}

function getTransferAcceptedPairKey(deviceA: string, deviceB: string): string {
	return `${TRANSFER_PAIR_ACCEPTED_PREFIX}${getTransferPairId(deviceA, deviceB)}`;
}

function parseTransferSession(raw: string | null): TransferSessionRecord | undefined {
	if (!raw) {
		return undefined;
	}

	try {
		const parsed = JSON.parse(raw) as TransferSessionRecord;
		if (!parsed?.transferId || !parsed?.senderDeviceId || !parsed?.receiverDeviceId || !parsed?.state) {
			return undefined;
		}

		return parsed;
	} catch {
		return undefined;
	}
}

async function getTransferSession(transferId: string): Promise<TransferSessionRecord | undefined> {
	const redis = getRedisClient();
	const raw = await redis.get(getTransferSessionKey(transferId));
	return parseTransferSession(raw);
}

async function saveTransferSession(session: TransferSessionRecord): Promise<void> {
	const redis = getRedisClient();
	const acceptedPairKey = getTransferAcceptedPairKey(session.senderDeviceId, session.receiverDeviceId);
	const sessionKey = getTransferSessionKey(session.transferId);

	const tx = redis.multi().set(sessionKey, JSON.stringify(session), {
		EX: TRANSFER_SESSION_TTL_SECONDS,
	});

	if (session.state === "accepted") {
		tx.sAdd(acceptedPairKey, session.transferId).expire(acceptedPairKey, TRANSFER_SESSION_TTL_SECONDS);
	} else {
		tx.sRem(acceptedPairKey, session.transferId);
	}

	await tx.exec();
}

async function removeTransferSessionInternal(session: TransferSessionRecord): Promise<void> {
	const redis = getRedisClient();
	await redis
		.multi()
		.del(getTransferSessionKey(session.transferId))
		.sRem(getTransferAcceptedPairKey(session.senderDeviceId, session.receiverDeviceId), session.transferId)
		.exec();
}

function isTransferPair(session: TransferSessionRecord, deviceA: string, deviceB: string): boolean {
	return (
		(session.senderDeviceId === deviceA && session.receiverDeviceId === deviceB) ||
		(session.senderDeviceId === deviceB && session.receiverDeviceId === deviceA)
	);
}

export async function registerTransferOffer(
	transferId: string,
	senderDeviceId: string,
	receiverDeviceId: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
	const lock = await acquireLock(getTransferLockKey(transferId), TRANSFER_LOCK_TTL_MS);
	if (!lock) {
		return { ok: false, reason: "Transfer operation is in progress" };
	}

	try {
		const existing = await getTransferSession(transferId);
		if (existing) {
			if (existing.senderDeviceId === senderDeviceId && existing.receiverDeviceId === receiverDeviceId) {
				const updated: TransferSessionRecord = {
					...existing,
					state: "offered",
					updatedAt: Date.now(),
				};
				await saveTransferSession(updated);
				return { ok: true };
			}

			return {
				ok: false,
				reason: "Transfer ID is already used by another transfer session",
			};
		}

		await saveTransferSession({
			transferId,
			senderDeviceId,
			receiverDeviceId,
			state: "offered",
			updatedAt: Date.now(),
		});

		return { ok: true };
	} finally {
		await releaseLock(lock);
	}
}

export async function ensureTransferParticipants(
	transferId: string,
	senderDeviceId: string,
	receiverDeviceId: string,
): Promise<TransferSessionRecord | undefined> {
	const lock = await acquireLock(getTransferLockKey(transferId), TRANSFER_LOCK_TTL_MS);
	if (!lock) {
		return undefined;
	}

	try {
		const session = await getTransferSession(transferId);
		if (!session) {
			return undefined;
		}

		if (session.senderDeviceId !== senderDeviceId || session.receiverDeviceId !== receiverDeviceId) {
			return undefined;
		}

		const updated: TransferSessionRecord = {
			...session,
			updatedAt: Date.now(),
		};
		await saveTransferSession(updated);
		return updated;
	} finally {
		await releaseLock(lock);
	}
}

export async function markTransferAccepted(transferId: string): Promise<void> {
	const lock = await acquireLock(getTransferLockKey(transferId), TRANSFER_LOCK_TTL_MS);
	if (!lock) {
		return;
	}

	try {
		const session = await getTransferSession(transferId);
		if (!session) {
			return;
		}

		const updated: TransferSessionRecord = {
			...session,
			state: "accepted",
			updatedAt: Date.now(),
		};
		await saveTransferSession(updated);
	} finally {
		await releaseLock(lock);
	}
}

export async function removeTransferSession(transferId: string): Promise<void> {
	const lock = await acquireLock(getTransferLockKey(transferId), TRANSFER_LOCK_TTL_MS);
	if (!lock) {
		return;
	}

	try {
		const session = await getTransferSession(transferId);
		if (!session) {
			await getRedisClient().del(getTransferSessionKey(transferId));
			return;
		}

		await removeTransferSessionInternal(session);
	} finally {
		await releaseLock(lock);
	}
}

async function findAcceptedSessionsByPair(deviceA: string, deviceB: string): Promise<TransferSessionRecord[]> {
	const redis = getRedisClient();
	const acceptedPairKey = getTransferAcceptedPairKey(deviceA, deviceB);
	const transferIds = await redis.sMembers(acceptedPairKey);
	if (transferIds.length === 0) {
		return [];
	}

	const sessions: TransferSessionRecord[] = [];
	const staleTransferIds: string[] = [];

	for (const transferId of transferIds) {
		const session = await getTransferSession(transferId);
		if (!session || session.state !== "accepted" || !isTransferPair(session, deviceA, deviceB)) {
			staleTransferIds.push(transferId);
			continue;
		}

		sessions.push(session);
	}

	if (staleTransferIds.length > 0) {
		await redis.sRem(acceptedPairKey, staleTransferIds);
	}

	return sessions;
}

export async function resolveTransferForAck(
	senderDeviceId: string,
	targetDeviceId: string,
	ackJson: string,
): Promise<TransferSessionRecord | undefined> {
	const parsedAck = safeJsonParse<{ transferId?: string }>(ackJson);
	const transferId = parsedAck.data?.transferId?.trim();

	if (transferId) {
		const lock = await acquireLock(getTransferLockKey(transferId), TRANSFER_LOCK_TTL_MS);
		if (!lock) {
			return undefined;
		}

		try {
			const session = await getTransferSession(transferId);
			if (!session || session.state !== "accepted") {
				return undefined;
			}

			if (!isTransferPair(session, senderDeviceId, targetDeviceId)) {
				return undefined;
			}

			const updated: TransferSessionRecord = {
				...session,
				updatedAt: Date.now(),
			};
			await saveTransferSession(updated);
			return updated;
		} finally {
			await releaseLock(lock);
		}
	}

	const pairSessions = await findAcceptedSessionsByPair(senderDeviceId, targetDeviceId);
	if (pairSessions.length !== 1) {
		return undefined;
	}

	const targetSession = pairSessions[0];
	const lock = await acquireLock(getTransferLockKey(targetSession.transferId), TRANSFER_LOCK_TTL_MS);
	if (!lock) {
		return undefined;
	}

	try {
		const current = await getTransferSession(targetSession.transferId);
		if (!current || current.state !== "accepted") {
			return undefined;
		}

		if (!isTransferPair(current, senderDeviceId, targetDeviceId)) {
			return undefined;
		}

		const updated: TransferSessionRecord = {
			...current,
			updatedAt: Date.now(),
		};
		await saveTransferSession(updated);
		return updated;
	} finally {
		await releaseLock(lock);
	}
}

export async function getTransferSessionForFallback(transferId: string): Promise<TransferSessionRecord | undefined> {
	return getTransferSession(transferId);
}

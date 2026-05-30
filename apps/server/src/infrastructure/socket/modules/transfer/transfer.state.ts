import { getRedisClient, withRedisLock } from "@/infrastructure/redis";
import {
	getTransferLockKey,
	RedisTransferRuntimeStore,
	type TransferRuntimeRedisClient,
	type TransferRuntimeStore,
	type TransferSessionRecord,
} from "@/modules/transfers";
import { safeJsonParse } from "@/shared/utils/json-helper";

export type { TransferSessionRecord } from "@/modules/transfers";

const TRANSFER_SESSION_TTL_SECONDS = 30 * 60;
const TRANSFER_LOCK_TTL_MS = 3000;

let transferStore: TransferRuntimeStore | null = null;

function getTransferStore(): TransferRuntimeStore {
	if (!transferStore) {
		transferStore = new RedisTransferRuntimeStore(getRedisClient() as unknown as TransferRuntimeRedisClient, {
			sessionTtlSeconds: TRANSFER_SESSION_TTL_SECONDS,
			eventTtlSeconds: TRANSFER_SESSION_TTL_SECONDS,
		});
	}

	return transferStore;
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
	return await withRedisLock<{ ok: true } | { ok: false; reason: string }>(
		getTransferLockKey(transferId),
		TRANSFER_LOCK_TTL_MS,
		async () => {
			const existing = await getTransferStore().getTransferSession(transferId);
			if (existing) {
				if (existing.senderDeviceId === senderDeviceId && existing.receiverDeviceId === receiverDeviceId) {
					const updated: TransferSessionRecord = {
						...existing,
						state: "offered",
						updatedAt: Date.now(),
					};
					await getTransferStore().saveTransferSession(updated);
					return { ok: true };
				}

				return {
					ok: false,
					reason: "Transfer ID is already used by another transfer session",
				};
			}

			await getTransferStore().saveTransferSession({
				transferId,
				senderDeviceId,
				receiverDeviceId,
				state: "offered",
				updatedAt: Date.now(),
			});

			return { ok: true };
		},
		() => ({ ok: false, reason: "Transfer operation is in progress" }),
	);
}

export async function ensureTransferParticipants(
	transferId: string,
	senderDeviceId: string,
	receiverDeviceId: string,
): Promise<TransferSessionRecord | undefined> {
	return await withRedisLock(
		getTransferLockKey(transferId),
		TRANSFER_LOCK_TTL_MS,
		async () => {
			const session = await getTransferStore().getTransferSession(transferId);
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
			await getTransferStore().saveTransferSession(updated);
			return updated;
		},
		() => undefined,
	);
}

export async function markTransferAccepted(transferId: string): Promise<void> {
	await withRedisLock(
		getTransferLockKey(transferId),
		TRANSFER_LOCK_TTL_MS,
		async () => {
			const session = await getTransferStore().getTransferSession(transferId);
			if (!session) {
				return;
			}

			const updated: TransferSessionRecord = {
				...session,
				state: "accepted",
				updatedAt: Date.now(),
			};
			await getTransferStore().saveTransferSession(updated);
		},
		() => undefined,
	);
}

export async function removeTransferSession(transferId: string): Promise<void> {
	await withRedisLock(
		getTransferLockKey(transferId),
		TRANSFER_LOCK_TTL_MS,
		async () => {
			const session = await getTransferStore().getTransferSession(transferId);
			if (!session) {
				await getTransferStore().removeTransferSessionById(transferId);
				return;
			}

			await getTransferStore().removeTransferSession(session);
		},
		() => undefined,
	);
}

export async function resolveTransferForAck(
	senderDeviceId: string,
	targetDeviceId: string,
	ackJson: string,
): Promise<TransferSessionRecord | undefined> {
	const parsedAck = safeJsonParse<{ transferId?: string }>(ackJson);
	const transferId = parsedAck.data?.transferId?.trim();

	if (transferId) {
		return await withRedisLock(
			getTransferLockKey(transferId),
			TRANSFER_LOCK_TTL_MS,
			async () => {
				const session = await getTransferStore().getTransferSession(transferId);
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
				await getTransferStore().saveTransferSession(updated);
				return updated;
			},
			() => undefined,
		);
	}

	const pairSessions = await getTransferStore().findAcceptedTransferSessionsByPair(senderDeviceId, targetDeviceId);
	if (pairSessions.length !== 1) {
		return undefined;
	}

	const targetSession = pairSessions[0];
	return await withRedisLock(
		getTransferLockKey(targetSession.transferId),
		TRANSFER_LOCK_TTL_MS,
		async () => {
			const current = await getTransferStore().getTransferSession(targetSession.transferId);
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
			await getTransferStore().saveTransferSession(updated);
			return updated;
		},
		() => undefined,
	);
}

export async function getTransferSessionForFallback(transferId: string): Promise<TransferSessionRecord | undefined> {
	return getTransferStore().getTransferSession(transferId);
}

import {
	getTransferAcceptedPairKey,
	getTransferEventsKey,
	getTransferProgressKey,
	getTransferRelayTicketKey,
	getTransferRelayTicketsByTransferKey,
	getTransferRuntimeKey,
	getTransferSessionKey,
} from "./transfer-redis-keys";
import type {
	StoredTransferRelayTicket,
	TransferProgress,
	TransferRuntime,
	TransferRuntimeEvent,
	TransferRuntimeStoreOptions,
	TransferSessionRecord,
	TransferSessionState,
} from "./transfer.types";
import type { TransferRuntimeStore } from "./transfer-runtime-store";

type RedisLikeMulti = {
	set(key: string, value: string, options?: { EX?: number }): RedisLikeMulti;
	del(key: string): RedisLikeMulti;
	sAdd(key: string, value: string): RedisLikeMulti;
	sRem(key: string, value: string | string[]): RedisLikeMulti;
	expire(key: string, seconds: number): RedisLikeMulti;
	exec(): Promise<unknown>;
};

export interface TransferRuntimeRedisClient {
	get(key: string): Promise<string | null>;
	set(key: string, value: string, options?: { EX?: number }): Promise<unknown>;
	del(key: string | string[]): Promise<unknown>;
	sMembers(key: string): Promise<string[]>;
	sRem(key: string, value: string | string[]): Promise<unknown>;
	lPush(key: string, value: string): Promise<unknown>;
	lRange(key: string, start: number, stop: number): Promise<string[]>;
	lTrim(key: string, start: number, stop: number): Promise<unknown>;
	expire(key: string, seconds: number): Promise<unknown>;
	multi(): RedisLikeMulti;
}

const DEFAULT_OPTIONS: TransferRuntimeStoreOptions = {
	sessionTtlSeconds: 30 * 60,
	eventTtlSeconds: 30 * 60,
	relayTicketTtlSeconds: 10 * 60,
};

function isTransferSessionState(value: unknown): value is TransferSessionState {
	return value === "offered" || value === "accepted";
}

function parseJson<T>(value: string | null): T | undefined {
	if (!value) {
		return undefined;
	}

	try {
		return JSON.parse(value) as T;
	} catch {
		return undefined;
	}
}

function parseTransferSession(value: string | null): TransferSessionRecord | undefined {
	const parsed = parseJson<TransferSessionRecord>(value);
	if (
		!parsed?.transferId ||
		!parsed.senderDeviceId ||
		!parsed.receiverDeviceId ||
		!isTransferSessionState(parsed.state)
	) {
		return undefined;
	}

	return parsed;
}

function isTransferPair(session: TransferSessionRecord, deviceA: string, deviceB: string): boolean {
	return (
		(session.senderDeviceId === deviceA && session.receiverDeviceId === deviceB) ||
		(session.senderDeviceId === deviceB && session.receiverDeviceId === deviceA)
	);
}

export class RedisTransferRuntimeStore implements TransferRuntimeStore {
	private readonly redis: TransferRuntimeRedisClient;
	private readonly options: TransferRuntimeStoreOptions;

	constructor(redis: TransferRuntimeRedisClient, options: Partial<TransferRuntimeStoreOptions> = {}) {
		this.redis = redis;
		this.options = { ...DEFAULT_OPTIONS, ...options };
	}

	async getTransferSession(transferId: string): Promise<TransferSessionRecord | undefined> {
		const raw = await this.redis.get(getTransferSessionKey(transferId));
		return parseTransferSession(raw);
	}

	async saveTransferSession(session: TransferSessionRecord): Promise<void> {
		const acceptedPairKey = getTransferAcceptedPairKey(session.senderDeviceId, session.receiverDeviceId);
		const tx = this.redis.multi().set(getTransferSessionKey(session.transferId), JSON.stringify(session), {
			EX: this.options.sessionTtlSeconds,
		});

		if (session.state === "accepted") {
			tx.sAdd(acceptedPairKey, session.transferId).expire(acceptedPairKey, this.options.sessionTtlSeconds);
		} else {
			tx.sRem(acceptedPairKey, session.transferId);
		}

		await tx.exec();
	}

	async removeTransferSession(session: TransferSessionRecord): Promise<void> {
		await this.redis
			.multi()
			.del(getTransferSessionKey(session.transferId))
			.sRem(getTransferAcceptedPairKey(session.senderDeviceId, session.receiverDeviceId), session.transferId)
			.exec();
	}

	async removeTransferSessionById(transferId: string): Promise<void> {
		await this.redis.del(getTransferSessionKey(transferId));
	}

	async findAcceptedTransferSessionsByPair(deviceA: string, deviceB: string): Promise<TransferSessionRecord[]> {
		const acceptedPairKey = getTransferAcceptedPairKey(deviceA, deviceB);
		const transferIds = await this.redis.sMembers(acceptedPairKey);
		if (transferIds.length === 0) {
			return [];
		}

		const sessions: TransferSessionRecord[] = [];
		const staleTransferIds: string[] = [];

		for (const transferId of transferIds) {
			const session = await this.getTransferSession(transferId);
			if (!session || session.state !== "accepted" || !isTransferPair(session, deviceA, deviceB)) {
				staleTransferIds.push(transferId);
				continue;
			}

			sessions.push(session);
		}

		if (staleTransferIds.length > 0) {
			await this.redis.sRem(acceptedPairKey, staleTransferIds);
		}

		return sessions;
	}

	async getRuntime(transferId: string): Promise<TransferRuntime | undefined> {
		const raw = await this.redis.get(getTransferRuntimeKey(transferId));
		return parseJson<TransferRuntime>(raw);
	}

	async saveRuntime(runtime: TransferRuntime): Promise<void> {
		await this.redis.set(getTransferRuntimeKey(runtime.transferId), JSON.stringify(runtime), {
			EX: this.options.sessionTtlSeconds,
		});
	}

	async removeRuntime(transferId: string): Promise<void> {
		await this.redis.del([
			getTransferRuntimeKey(transferId),
			getTransferProgressKey(transferId),
			getTransferEventsKey(transferId),
			getTransferRelayTicketsByTransferKey(transferId),
		]);
	}

	async getProgress(transferId: string): Promise<TransferProgress | undefined> {
		const raw = await this.redis.get(getTransferProgressKey(transferId));
		return parseJson<TransferProgress>(raw);
	}

	async saveProgress(transferId: string, progress: TransferProgress): Promise<void> {
		await this.redis.set(getTransferProgressKey(transferId), JSON.stringify(progress), {
			EX: this.options.sessionTtlSeconds,
		});
	}

	async getRelayTicket(ticketId: string): Promise<StoredTransferRelayTicket | undefined> {
		const raw = await this.redis.get(getTransferRelayTicketKey(ticketId));
		return parseJson<StoredTransferRelayTicket>(raw);
	}

	async addRelayTicket(ticket: StoredTransferRelayTicket): Promise<void> {
		await this.redis
			.multi()
			.set(getTransferRelayTicketKey(ticket.id), JSON.stringify(ticket), {
				EX: ticket.ttlSeconds,
			})
			.sAdd(getTransferRelayTicketsByTransferKey(ticket.transferId), ticket.id)
			.expire(getTransferRelayTicketsByTransferKey(ticket.transferId), ticket.ttlSeconds)
			.exec();
	}

	async addEvent(event: TransferRuntimeEvent): Promise<void> {
		const key = getTransferEventsKey(event.transferId);
		await this.redis.lPush(key, JSON.stringify(event));
		await this.redis.lTrim(key, 0, 99);
		await this.redis.expire(key, this.options.eventTtlSeconds);
	}

	async listRecentEvents(transferId: string, limit = 50): Promise<TransferRuntimeEvent[]> {
		const stop = Math.max(0, limit - 1);
		const entries = await this.redis.lRange(getTransferEventsKey(transferId), 0, stop);
		return entries
			.map((entry) => parseJson<TransferRuntimeEvent>(entry))
			.filter((entry): entry is TransferRuntimeEvent => entry !== undefined);
	}
}

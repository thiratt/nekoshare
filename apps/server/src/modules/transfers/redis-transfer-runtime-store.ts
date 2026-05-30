import {
	getTransferEventsKey,
	getTransferProgressKey,
	getTransferRelayTicketKey,
	getTransferRelayTicketsByTransferKey,
	getTransferRuntimeKey,
} from "./transfer-redis-keys";
import type {
	TransferProgress,
	TransferRelayTicket,
	TransferRuntime,
	TransferRuntimeEvent,
	TransferRuntimeStoreOptions,
} from "./transfer.types";
import type { TransferRuntimeStore } from "./transfer-runtime-store";

type RedisLikeMulti = {
	set(key: string, value: string, options?: { EX?: number }): RedisLikeMulti;
	del(key: string): RedisLikeMulti;
	sAdd(key: string, value: string): RedisLikeMulti;
	expire(key: string, seconds: number): RedisLikeMulti;
	exec(): Promise<unknown>;
};

export interface TransferRuntimeRedisClient {
	get(key: string): Promise<string | null>;
	set(key: string, value: string, options?: { EX?: number }): Promise<unknown>;
	del(key: string | string[]): Promise<unknown>;
	lPush(key: string, value: string): Promise<unknown>;
	lRange(key: string, start: number, stop: number): Promise<string[]>;
	lTrim(key: string, start: number, stop: number): Promise<unknown>;
	expire(key: string, seconds: number): Promise<unknown>;
	multi(): RedisLikeMulti;
}

const DEFAULT_OPTIONS: TransferRuntimeStoreOptions = {
	sessionTtlSeconds: 30 * 60,
	eventTtlSeconds: 30 * 60,
};

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

export class RedisTransferRuntimeStore implements TransferRuntimeStore {
	private readonly redis: TransferRuntimeRedisClient;
	private readonly options: TransferRuntimeStoreOptions;

	constructor(redis: TransferRuntimeRedisClient, options: Partial<TransferRuntimeStoreOptions> = {}) {
		this.redis = redis;
		this.options = { ...DEFAULT_OPTIONS, ...options };
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

	async getRelayTicket(ticketId: string): Promise<TransferRelayTicket | undefined> {
		const raw = await this.redis.get(getTransferRelayTicketKey(ticketId));
		return parseJson<TransferRelayTicket>(raw);
	}

	async addRelayTicket(ticket: TransferRelayTicket): Promise<void> {
		await this.redis
			.multi()
			.set(getTransferRelayTicketKey(ticket.id), JSON.stringify(ticket), { EX: this.options.sessionTtlSeconds })
			.sAdd(getTransferRelayTicketsByTransferKey(ticket.transferId), ticket.id)
			.expire(getTransferRelayTicketsByTransferKey(ticket.transferId), this.options.sessionTtlSeconds)
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

import { randomUUID } from "node:crypto";

import { getRedisClient } from "./client";

const RELEASE_LOCK_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
	return redis.call("DEL", KEYS[1])
else
	return 0
end
`;

export type RedisLock = {
	key: string;
	token: string;
};

type RedisLockCallback<T> = () => T | Promise<T>;

export async function acquireLock(key: string, ttlMs: number): Promise<RedisLock | null> {
	const redis = getRedisClient();
	const token = randomUUID();
	const result = await redis.set(key, token, { NX: true, PX: ttlMs });
	if (result !== "OK") {
		return null;
	}

	return { key, token };
}

export async function releaseLock(lock: RedisLock): Promise<void> {
	const redis = getRedisClient();
	await redis.eval(RELEASE_LOCK_SCRIPT, {
		keys: [lock.key],
		arguments: [lock.token],
	});
}

export async function withRedisLock<T>(
	key: string,
	ttlMs: number,
	operation: RedisLockCallback<T>,
	onUnavailable: RedisLockCallback<T>,
): Promise<T> {
	const lock = await acquireLock(key, ttlMs);
	if (!lock) {
		return await onUnavailable();
	}

	try {
		return await operation();
	} finally {
		await releaseLock(lock);
	}
}

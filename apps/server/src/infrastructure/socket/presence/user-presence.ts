import { Logger } from "@/infrastructure/logger";
import { getRedisClient } from "@/infrastructure/redis";

const PRESENCE_TTL_SECONDS = 90;
const PRESENCE_HEARTBEAT_MS = 30_000;
const PRESENCE_KEY_PREFIX = "presence:user:";

const localUserSessionCounts = new Map<string, number>();
let heartbeatTimer: NodeJS.Timeout | null = null;

function getPresenceKey(userId: string): string {
	return `${PRESENCE_KEY_PREFIX}${userId}`;
}

function startHeartbeatIfNeeded(): void {
	if (heartbeatTimer !== null || localUserSessionCounts.size === 0) {
		return;
	}

	heartbeatTimer = setInterval(() => {
		void refreshPresenceTtl();
	}, PRESENCE_HEARTBEAT_MS);
	heartbeatTimer.unref?.();
}

function stopHeartbeatIfIdle(): void {
	if (localUserSessionCounts.size > 0 || heartbeatTimer === null) {
		return;
	}

	clearInterval(heartbeatTimer);
	heartbeatTimer = null;
}

function incrementLocalCount(userId: string): void {
	const current = localUserSessionCounts.get(userId) ?? 0;
	localUserSessionCounts.set(userId, current + 1);
	startHeartbeatIfNeeded();
}

function decrementLocalCount(userId: string): void {
	const current = localUserSessionCounts.get(userId) ?? 0;
	if (current <= 1) {
		localUserSessionCounts.delete(userId);
		stopHeartbeatIfIdle();
		return;
	}

	localUserSessionCounts.set(userId, current - 1);
}

async function refreshPresenceTtl(): Promise<void> {
	if (localUserSessionCounts.size === 0) {
		return;
	}

	const redis = getRedisClient();
	for (const userId of localUserSessionCounts.keys()) {
		try {
			await redis.expire(getPresenceKey(userId), PRESENCE_TTL_SECONDS);
		} catch (error) {
			Logger.warn("Presence", `Failed to refresh presence TTL for user ${userId}`, error);
		}
	}
}

export async function registerUserPresenceSession(userId: string): Promise<boolean> {
	incrementLocalCount(userId);

	try {
		const redis = getRedisClient();
		const key = getPresenceKey(userId);

		const nextCount = await redis.incr(key);
		await redis.expire(key, PRESENCE_TTL_SECONDS);
		return nextCount === 1;
	} catch (error) {
		decrementLocalCount(userId);
		throw error;
	}
}

export async function unregisterUserPresenceSession(userId: string): Promise<boolean> {
	decrementLocalCount(userId);

	const redis = getRedisClient();
	const key = getPresenceKey(userId);

	const nextCount = await redis.decr(key);
	if (nextCount <= 0) {
		await redis.del(key);
		return true;
	}

	await redis.expire(key, PRESENCE_TTL_SECONDS);
	return false;
}

export async function isUserOnline(userId: string): Promise<boolean> {
	const redis = getRedisClient();
	const currentCount = await redis.get(getPresenceKey(userId));
	return Number(currentCount ?? 0) > 0;
}

export function shutdownUserPresenceTracking(): void {
	if (heartbeatTimer) {
		clearInterval(heartbeatTimer);
		heartbeatTimer = null;
	}

	localUserSessionCounts.clear();
}

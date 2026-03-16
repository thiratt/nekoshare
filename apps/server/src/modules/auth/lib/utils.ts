import { Logger } from "@/infrastructure/logger";
import { getRedisClient } from "@/infrastructure/redis";

const SESSION_DEVICE_CACHE_TTL_SECONDS = 60;
const SESSION_DEVICE_CACHE_KEY_PREFIX = "auth:session:device:";
const SESSION_DEVICE_CACHE_NULL_MARKER = "__none__";

function getSessionDeviceCacheKey(sessionId: string): string {
	return `${SESSION_DEVICE_CACHE_KEY_PREFIX}${sessionId}`;
}

async function readCachedDeviceIdBySessionId(sessionId: string): Promise<string | null | undefined> {
	try {
		const cachedValue = await getRedisClient().get(getSessionDeviceCacheKey(sessionId));
		if (cachedValue === null) {
			return undefined;
		}

		return cachedValue === SESSION_DEVICE_CACHE_NULL_MARKER ? null : cachedValue;
	} catch (error) {
		Logger.warn("Auth", `Failed to read session-device cache for session ${sessionId}`, error);
		return undefined;
	}
}

async function cacheDeviceIdBySessionId(sessionId: string, deviceId: string | null): Promise<void> {
	try {
		const cacheValue = deviceId ?? SESSION_DEVICE_CACHE_NULL_MARKER;
		await getRedisClient().set(getSessionDeviceCacheKey(sessionId), cacheValue, {
			EX: SESSION_DEVICE_CACHE_TTL_SECONDS,
		});
	} catch (error) {
		Logger.warn("Auth", `Failed to write session-device cache for session ${sessionId}`, error);
	}
}

function normalizeTrustedOrigin(candidate: string | undefined): string | null {
	const value = candidate?.trim();
	if (!value) {
		return null;
	}

	try {
		const parsedUrl = new URL(value);
		if (parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:") {
			return parsedUrl.origin;
		}

		return value;
	} catch {
		return value;
	}
}

function collectTrustedOrigins(...candidates: Array<string | undefined>): string[] {
	const trustedOrigins = new Set<string>();

	for (const candidate of candidates) {
		if (!candidate) {
			continue;
		}

		for (const value of candidate.split(",")) {
			const normalized = normalizeTrustedOrigin(value);
			if (normalized) {
				trustedOrigins.add(normalized);
			}
		}
	}

	return [...trustedOrigins];
}

export { cacheDeviceIdBySessionId, collectTrustedOrigins, readCachedDeviceIdBySessionId };

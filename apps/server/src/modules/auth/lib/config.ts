import type { BetterAuthOptions } from "better-auth";
import { eq } from "drizzle-orm";
import { bearer, customSession, oneTimeToken, username } from "better-auth/plugins";

import { db } from "@/infrastructure/db";
import { userPreference } from "@/infrastructure/db/schemas";
import { env } from "@/config/env";
import { hashPassword, verifyPassword } from "./password-hash";
import { Logger } from "@/infrastructure/logger";
import { getRedisClient } from "@/infrastructure/redis";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";

const RESERVED_USERNAMES = ["admin", "dev", "system", "root", "nekoshare"] as const;
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

const databaseOptions: BetterAuthOptions["database"] = drizzleAdapter(db, {
	provider: "mysql",
	usePlural: true,
});

const databaseHookOptions: BetterAuthOptions["databaseHooks"] = {
	user: {
		create: {
			after: async (user) => {
				try {
					await db.insert(userPreference).values({
						userId: user.id,
						updatedAt: new Date(),
					});
				} catch (err) {
					Logger.error("Auth", `Failed to create user preference for user ${user.id}`, err);
				}
			},
		},
	},
};

const emailAndPasswordOptions: BetterAuthOptions["emailAndPassword"] = {
	enabled: true,
	password: {
		hash: async (password) => await hashPassword(password),
		verify: async ({ hash, password }) => await verifyPassword(hash, password),
	},
	requireEmailVerification: false,
};

const socialProvidersOptions: BetterAuthOptions["socialProviders"] = {
	google: {
		prompt: "select_account",
		clientId: env.GOOGLE_CLIENT_ID,
		clientSecret: env.GOOGLE_CLIENT_SECRET,
	},
};

const pluginsOptions = [
	bearer(),
	customSession(async ({ user, session }) => {
		const cachedDeviceId = await readCachedDeviceIdBySessionId(session.id);
		if (cachedDeviceId !== undefined) {
			return {
				user: {
					...user,
					deviceId: cachedDeviceId,
				},
				session: {
					...session,
				},
			};
		}

		const userDevice = await db.query.device.findFirst({
			where: (devices) => eq(devices.currentSessionId, session.id),
			columns: { id: true },
		});
		const deviceId = userDevice?.id ?? null;
		await cacheDeviceIdBySessionId(session.id, deviceId);

		return {
			user: {
				...user,
				deviceId,
			},
			session: {
				...session,
			},
		};
	}),
	oneTimeToken(),
	username({
		usernameValidator(username) {
			return !RESERVED_USERNAMES.includes(username as (typeof RESERVED_USERNAMES)[number]);
		},
	}),
];

const trustedOriginsOptions: BetterAuthOptions["trustedOrigins"] = [
	"http://localhost:7780",
	"http://localhost:7787",
	"http://tauri.localhost",
];

const loggerOptions: BetterAuthOptions["logger"] = {
	level: env.NODE_ENV === "production" ? "info" : "debug",
	log(level, message, ...args) {
		Logger[level]("App (Better Auth)", message, ...args);
	},
};

const advancedOptions: BetterAuthOptions["advanced"] = {
	cookiePrefix: "c_nekoshare_auth_",
	useSecureCookies: true,
	defaultCookieAttributes: {
		sameSite: "none",
		secure: true,
		httpOnly: true,
	},
};

const sessionOptions: BetterAuthOptions["session"] = {
	cookieCache: {
		enabled: true,
		maxAge: 5 * 60,
	},
};

export {
	db, // for convenience
	databaseOptions,
	databaseHookOptions,
	emailAndPasswordOptions,
	socialProvidersOptions,
	pluginsOptions,
	trustedOriginsOptions,
	loggerOptions,
	advancedOptions,
	sessionOptions,
};

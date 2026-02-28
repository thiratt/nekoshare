import type { BetterAuthOptions } from "better-auth";
import { eq } from "drizzle-orm";
import { bearer, customSession, oneTimeToken, username } from "better-auth/plugins";

import { db } from "@/infrastructure/db";
import { userPreference } from "@/infrastructure/db/schemas";
import { env } from "@/config/env";
import { hashPassword, verifyPassword } from "./password-hash";
import { Logger } from "@/infrastructure/logger";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

const RESERVED_USERNAMES = ["admin", "dev", "system", "root", "nekoshare"] as const;

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
	customSession(async ({ user, session }, ctx) => {
		const userDeviceId = await db.query.device.findFirst({
			where: (devices) => eq(devices.currentSessionId, session.id),
		});
		return {
			user: {
				...user,
				deviceId: userDeviceId ? userDeviceId.id : null,
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

// const sessionOptions: BetterAuthOptions["session"] = {
// 	cookieCache: {
// 		enabled: true,
// 		maxAge: 5 * 60,
// 	},
// };

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
	// sessionOptions,
};

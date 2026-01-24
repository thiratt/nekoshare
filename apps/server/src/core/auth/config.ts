import type { BetterAuthOptions } from "better-auth";
import { bearer, oneTimeToken, username } from "better-auth/plugins";

import { db } from "@/adapters/db";
import { userPreference } from "@/adapters/db/schemas/n";
import { env } from "@/config/env";
import { hashPassword, verifyPassword } from "@/core/crypto/hash";
import { Logger } from "@/core/logger";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

const RESERVED_USERNAMES = ["admin", "dev", "system", "root", "nekoshare"] as const;

const databaseOptions: BetterAuthOptions["database"] = drizzleAdapter(db, {
	provider: "mysql",
});

const databaseHookOptions: BetterAuthOptions["databaseHooks"] = {
	user: {
		create: {
			after: async (user) => {
				db.insert(userPreference)
					.values({
						userId: user.id,
						updatedAt: new Date(),
					})
					.catch((err) => {
						console.error("Error creating user preference:", err);
					});
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
	username({
		usernameValidator(username) {
			return !RESERVED_USERNAMES.includes(username as (typeof RESERVED_USERNAMES)[number]);
		},
	}),
	oneTimeToken(),
	bearer(),
];

const trustedOriginsOptions: BetterAuthOptions["trustedOrigins"] = ["http://localhost:7780", "http://localhost:7787", "http://tauri.localhost"];

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

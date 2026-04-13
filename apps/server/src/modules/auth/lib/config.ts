import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { bearer, customSession, oneTimeToken, username } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import type { BetterAuthOptions } from "better-auth";

import { createEmailVerificationEmailHtml, sendAuthEmail } from "./email";
import { hashPassword, verifyPassword } from "./password-hash";
import { cacheDeviceIdBySessionId, collectTrustedOrigins, readCachedDeviceIdBySessionId } from "./utils";

import { env } from "@/config/env";
import { db } from "@/infrastructure/db";
import { Logger } from "@/infrastructure/logger";
import { getServerT } from "@workspace/i18n/server";

const RESERVED_USERNAMES = ["admin", "dev", "system", "root", "nekoshare"] as const;

const databaseOptions: BetterAuthOptions["database"] = drizzleAdapter(db, {
	provider: "mysql",
	usePlural: true,
});

const emailAndPasswordOptions: BetterAuthOptions["emailAndPassword"] = {
	enabled: true,
	password: {
		hash: async (password) => await hashPassword(password),
		verify: async ({ hash, password }) => await verifyPassword(hash, password),
	},
	requireEmailVerification: false,
};

const emailVerificationOptions: BetterAuthOptions["emailVerification"] = {
	sendVerificationEmail: async ({ user, url }) => {
		const userLanguage = (user as { language?: string | null }).language ?? undefined;
		const t = await getServerT(userLanguage);
		const sent = await sendAuthEmail({
			html: await createEmailVerificationEmailHtml(user.email, url, userLanguage),
			subject: t("serverAuth.email.changeEmail.subject"),
			text: t("serverAuth.email.changeEmail.text", { url }),
			to: user.email,
		});

		if (!sent) {
			throw new Error("email_delivery_unavailable");
		}
	},
};

const socialProvidersOptions: BetterAuthOptions["socialProviders"] = {
	google: {
		prompt: "select_account",
		disableImplicitSignUp: true,
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

const trustedOriginsOptions: BetterAuthOptions["trustedOrigins"] = collectTrustedOrigins(...env.ALLOWED_ORIGINS);

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
	advancedOptions,
	databaseOptions,
	db, // for convenience
	emailAndPasswordOptions,
	emailVerificationOptions,
	loggerOptions,
	pluginsOptions,
	sessionOptions,
	socialProvidersOptions,
	trustedOriginsOptions,
};

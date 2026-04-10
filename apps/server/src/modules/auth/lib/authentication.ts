import { betterAuth } from "better-auth";

import {
	advancedOptions,
	databaseHookOptions,
	databaseOptions,
	emailAndPasswordOptions,
	loggerOptions,
	pluginsOptions,
	sessionOptions,
	socialProvidersOptions,
	trustedOriginsOptions,
} from "./config";
import { accountSchemaOptions, userSchemaOptions } from "./schema";

import { env } from "@/config/env";

export const auth = betterAuth({
	appName: "Nekoshare",
	baseURL: env.BETTER_AUTH_URL,
	basePath: "auth",
	database: databaseOptions,
	databaseHooks: databaseHookOptions,
	emailAndPassword: emailAndPasswordOptions,
	socialProviders: socialProvidersOptions,
	secret: env.BETTER_AUTH_SECRET,
	session: sessionOptions,
	plugins: pluginsOptions,
	trustedOrigins: trustedOriginsOptions,
	logger: loggerOptions,
	account: accountSchemaOptions,
	user: userSchemaOptions,
	advanced: advancedOptions,
});

export type AuthType = {
	session: typeof auth.$Infer.Session.session | null;
	user: typeof auth.$Infer.Session.user | null;
};

export type AuthenticatedType = {
	session: typeof auth.$Infer.Session.session;
	user: typeof auth.$Infer.Session.user;
};

export type Session = typeof auth.$Infer.Session.session;
export type User = typeof auth.$Infer.Session.user;

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import {
	databaseHookOptions,
	db,
	emailAndPasswordOptions,
	loggerOptions,
	pluginsOptions,
	socialProvidersOptions,
	trustedOriginsOptions,
} from "./config";

export const auth = betterAuth({
	appName: "Nekoshare",
	basePath: "auth",
	database: drizzleAdapter(db, {
		provider: "mysql",
	}),
	databaseHooks: databaseHookOptions,
	emailAndPassword: emailAndPasswordOptions,
	socialProviders: socialProvidersOptions,
	plugins: pluginsOptions,
	trustedOrigins: trustedOriginsOptions,
	logger: loggerOptions,
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

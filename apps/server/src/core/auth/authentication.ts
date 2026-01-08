import { betterAuth } from "better-auth";

import {
	databaseHookOptions,
	databaseOptions,
	emailAndPasswordOptions,
	loggerOptions,
	pluginsOptions,
	socialProvidersOptions,
	trustedOriginsOptions,
} from "./config";
import { userSchemaOptions } from "./schema";

export const auth = betterAuth({
	appName: "Nekoshare",
	basePath: "auth",
	database: databaseOptions,
	databaseHooks: databaseHookOptions,
	emailAndPassword: emailAndPasswordOptions,
	socialProviders: socialProvidersOptions,
	plugins: pluginsOptions,
	trustedOrigins: trustedOriginsOptions,
	logger: loggerOptions,
	user: userSchemaOptions,
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

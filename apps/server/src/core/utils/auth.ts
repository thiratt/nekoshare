import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/adapters/db";
import { env } from "@/config/env";
import { username } from "better-auth/plugins";
import { hashPassword, verifyPassword } from "../crypto/hash";
import { sendVerificationEmail } from "./email";
import { APP_NAME } from "@workspace/app-config/app/index";

export const auth = betterAuth({
	appName: APP_NAME,
	basePath: "auth",
	database: drizzleAdapter(db, {
		provider: "mysql",
	}),
	// databaseHooks: {
	// 	session: {

	// 	}
	// },
	emailAndPassword: {
		enabled: true,
		password: {
			hash: async (password) => await hashPassword(password),
			verify: async ({ hash, password }) => await verifyPassword(hash, password),
		},
		requireEmailVerification: true,
	},
	emailVerification: {
		sendVerificationEmail: async ({ url, user }) => {
			const { username } = user as typeof auth.$Infer.Session.user;
			if (username) {
				const res = await sendVerificationEmail(user.email, username, url);
			}
		},
		sendOnSignUp: true,
		autoSignInAfterVerification: true,
		expiresIn: 300,
	},
	socialProviders: {
		google: {
			prompt: "select_account",
			clientId: env.GOOGLE_CLIENT_ID,
			clientSecret: env.GOOGLE_CLIENT_SECRET,
		},
	},
	plugins: [
		username({
			schema: {
				user: {},
			},
			usernameValidator(username) {
				switch (username) {
					case "admin":
					case "dev":
						return false;

					default:
						return true;
				}
			},
		}),
		// emailOTP({
		// 	async sendVerificationOTP({ email, otp, type }) {
		// 		console.log(type);
		// 	},
		// }),
	],
	trustedOrigins: ["http://localhost:3000"],
	// session: {
	// 	cookieCache: {
	// 		enabled: true,
	// 		maxAge: 5 * 60,
	// 	},
	// },
});

export type AuthType = {
	session: typeof auth.$Infer.Session.session | null;
	user: typeof auth.$Infer.Session.user | null;
};

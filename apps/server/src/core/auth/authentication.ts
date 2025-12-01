import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { username } from "better-auth/plugins";

import { db } from "@/adapters/db";
import { env } from "@/config/env";
import { hashPassword, verifyPassword } from "@/core/crypto/hash";
import { userPreference } from "@/adapters/db/schemas";
// import { sendVerificationEmail } from "./email";

export const auth = betterAuth({
	appName: "Nekoshare",
	basePath: "auth",
	database: drizzleAdapter(db, {
		provider: "mysql",
	}),
	databaseHooks: {
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
	},
	emailAndPassword: {
		enabled: true,
		password: {
			hash: async (password) => await hashPassword(password),
			verify: async ({ hash, password }) => await verifyPassword(hash, password),
		},
		requireEmailVerification: false,
	},
	// emailVerification: {
	// 	sendVerificationEmail: async ({ url, user }) => {
	// 		const { username } = user as typeof auth.$Infer.Session.user;
	// 		if (username) {
	// 			const res = await sendVerificationEmail(user.email, username, url);
	// 		}
	// 	},
	// 	sendOnSignUp: true,
	// 	autoSignInAfterVerification: true,
	// 	expiresIn: 300,
	// },
	socialProviders: {
		google: {
			prompt: "select_account",
			clientId: env.GOOGLE_CLIENT_ID,
			clientSecret: env.GOOGLE_CLIENT_SECRET,
		},
	},
	plugins: [
		username({
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
	trustedOrigins: ["http://localhost:7780", "http://localhost:7783"],
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

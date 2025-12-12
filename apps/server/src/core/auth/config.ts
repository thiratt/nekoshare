import type { BetterAuthOptions } from "better-auth";
import { username } from "better-auth/plugins";

import { env } from "@/config/env";
import { hashPassword, verifyPassword } from "@/core/crypto/hash";

const RESERVED_USERNAMES = ["admin", "dev", "system", "root", "nekoshare"] as const;

export const emailAndPasswordOptions: BetterAuthOptions["emailAndPassword"] = {
	enabled: true,
	password: {
		hash: async (password) => await hashPassword(password),
		verify: async ({ hash, password }) => await verifyPassword(hash, password),
	},
	requireEmailVerification: false,
};

export const socialProvidersOptions: BetterAuthOptions["socialProviders"] = {
	google: {
		prompt: "select_account",
		clientId: env.GOOGLE_CLIENT_ID,
		clientSecret: env.GOOGLE_CLIENT_SECRET,
	},
};

export const pluginsOptions = [
	username({
		usernameValidator(username) {
			return !RESERVED_USERNAMES.includes(username as (typeof RESERVED_USERNAMES)[number]);
		},
	}),
	// emailOTP({
	// 	async sendVerificationOTP({ email, otp, type }) {
	// 		console.log(type);
	// 	},
	// }),
];

export const trustedOriginsOptions: BetterAuthOptions["trustedOrigins"] = [
	"http://localhost:7780",
	"http://localhost:7787",
];

// export const sessionOptions: BetterAuthOptions["session"] = {
// 	cookieCache: {
// 		enabled: true,
// 		maxAge: 5 * 60,
// 	},
// };

// export const emailVerificationOptions: BetterAuthOptions["emailVerification"] = {
// 	sendVerificationEmail: async ({ url, user }) => {
// 		// const { username } = user as typeof auth.$Infer.Session.user;
// 		// if (username) {
// 		// 	const res = await sendVerificationEmail(user.email, username, url);
// 		// }
// 	},
// 	sendOnSignUp: true,
// 	autoSignInAfterVerification: true,
// 	expiresIn: 300,
// };

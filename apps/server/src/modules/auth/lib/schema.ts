import type { BetterAuthOptions } from "better-auth";

const accountSchemaOptions: BetterAuthOptions["account"] = {
	accountLinking: {
		enabled: false,
	},
	fields: {
		password: "password_hash",
	},
};

const userSchemaOptions: BetterAuthOptions["user"] = {
	additionalFields: {
		role: {
			type: ["admin", "user"],
			required: true,
			defaultValue: "user",
		},
		theme: {
			type: ["light", "dark", "system"],
			required: true,
			defaultValue: "system",
		},
		language: {
			type: ["en", "th"],
			required: true,
			defaultValue: "th",
		},
		lastActiveAt: {
			type: "date",
			required: true,
			defaultValue: () => new Date(),
		},
	},
	changeEmail: {
		enabled: true,
	},
	deleteUser: {
		enabled: true,
	},
};

export { accountSchemaOptions, userSchemaOptions };

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

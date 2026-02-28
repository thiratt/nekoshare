import type { BetterAuthOptions } from "better-auth";

const accountSchemaOptions: BetterAuthOptions["account"] = {
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
};

export { accountSchemaOptions, userSchemaOptions };

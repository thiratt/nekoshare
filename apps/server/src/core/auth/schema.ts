import type { BetterAuthOptions } from "better-auth";

const userSchemaOptions: BetterAuthOptions["user"] = {
	additionalFields: {
		role: {
			type: ["admin", "user"],
			required: true,
			defaultValue: "user",
		},
		isBanned: {
			type: "boolean",
			required: true,
			defaultValue: false,
		},
	},
};

export { userSchemaOptions };

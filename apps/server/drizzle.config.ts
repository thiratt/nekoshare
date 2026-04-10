import { defineConfig } from "drizzle-kit";

import { env } from "@/config/env";

export default defineConfig({
	out: "./drizzle",
	schema: "./src/infrastructure/db/schemas",
	dialect: "mysql",
	dbCredentials: {
		host: env.DATABASE.host,
		port: env.DATABASE.port,
		user: env.DATABASE.user,
		...(env.DATABASE.password === undefined ? {} : { password: env.DATABASE.password }),
		database: env.DATABASE.database,
	},
	verbose: true,
	strict: true,
});

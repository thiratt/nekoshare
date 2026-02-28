import { env } from "@/config/env";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
	out: "./drizzle",
	schema: "./src/infrastructure/db/schemas",
	dialect: "mysql",
	dbCredentials: {
		host: env.DB_HOST,
		user: env.DB_USER,
		password: env.DB_PASSWORD,
		database: env.DB_NAME,
		port: env.DB_PORT,
	},
	verbose: true,
	strict: true,
});

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { env } from "@/config/env";
import * as schema from "@/adapters/db/schemas";

const poolConnection = mysql.createPool({
	host: env.DB_HOST,
	user: env.DB_USER,
	password: env.DB_PASSWORD,
	database: env.DB_NAME,
	port: env.DB_PORT,
});

const db = drizzle(poolConnection, { schema: schema, mode: "default" });
// const db = drizzle(poolConnection);
export { db };

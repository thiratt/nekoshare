import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

import { env } from "@/config/env";
import { Logger } from "@/infrastructure/logger";

import * as schema from "./schemas";

const poolConnection = mysql.createPool({
	host: env.DB_HOST,
	user: env.DB_USER,
	password: env.DB_PASSWORD,
	database: env.DB_NAME,
	port: env.DB_PORT,
});

const db = drizzle(poolConnection, { schema, mode: "default" });

async function checkDatabaseConnection(): Promise<boolean> {
	try {
		await db.execute(sql`SELECT 1`);
		return true;
	} catch (error) {
		Logger.error("Database", "Failed to connect to database", error);
		return false;
	}
}

async function getExistingTables(): Promise<string[]> {
	const result = await db.execute(sql`SHOW TABLES`);
	const rows = result[0] as unknown as Record<string, string>[];
	return rows.map((row) => Object.values(row)[0]);
}

async function ensureTablesExist(): Promise<void> {
	const existingTables = await getExistingTables();
	const requiredTables = [
		"users",
		"sessions",
		"accounts",
		"verifications",
		"user_settings",
		"devices",
		"friends",
		"public_share",
		"public_share_files",
		"transfer_metrics",
		"notifications",
	];

	const missingTables = requiredTables.filter((tableName) => !existingTables.includes(tableName));
	if (missingTables.length === 0) {
		Logger.info("Database", "All required tables exist");
		return;
	}

	const commandHint = "pnpm -C apps/server drizzle-kit push";
	throw new Error(
		`Missing required database tables: ${missingTables.join(", ")}. Run '${commandHint}' before starting the server.`,
	);
}

async function initializeDatabase(): Promise<void> {
	Logger.info("Database", "Initializing database...");

	const isConnected = await checkDatabaseConnection();
	if (!isConnected) {
		throw new Error("Failed to connect to database");
	}
	Logger.info("Database", "Database connection established");

	await ensureTablesExist();
	Logger.info("Database", "Database initialization complete");
}

export { db, poolConnection, checkDatabaseConnection, ensureTablesExist, initializeDatabase };

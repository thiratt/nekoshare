import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";
import mysql from "mysql2/promise";
import { env } from "@/config/env";
import * as schema from "@/adapters/db/schemas";
import { Logger } from "@/core/logger";
import { execSync } from "child_process";

const poolConnection = mysql.createPool({
	host: env.DB_HOST,
	user: env.DB_USER,
	password: env.DB_PASSWORD,
	database: env.DB_NAME,
	port: env.DB_PORT,
});

const db = drizzle(poolConnection, { schema: schema, mode: "default" });

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
		"user",
		"session",
		"account",
		"verification",
		"user_preference",
		"device",
		"friend",
		"flash_share",
		"transfer_history",
		"notification",
	];

	if (existingTables.length === requiredTables.length) {
		Logger.info("Database", "All required tables exist");
		return;
	}

	Logger.info("Database", "Creating missing tables...");

	try {
		const output = execSync("pnpm drizzle-kit push --force", {
			encoding: "utf-8",
			stdio: ["pipe", "pipe", "pipe"],
		});
		Logger.debug("Database", `Database push output:\n${output}`);
		Logger.info("Database", "All tables created successfully");
	} catch (error) {
		Logger.error("Database", "Failed to create tables", error);
		throw error;
	}
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

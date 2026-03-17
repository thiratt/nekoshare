import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql from "mysql2/promise";
import { existsSync } from "node:fs";
import path from "node:path";

import * as schema from "./schemas";

import { env } from "@/config/env";
import { Logger } from "@/infrastructure/logger";

const poolConnection = mysql.createPool({
	host: env.DB_HOST,
	user: env.DB_USER,
	password: env.DB_PASSWORD,
	database: env.DB_NAME,
	port: env.DB_PORT,
});

const db = drizzle(poolConnection, { schema, mode: "default" });

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
] as const;

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

function resolveMigrationsFolder(): string {
	const candidateFolders = [
		path.resolve(process.cwd(), "drizzle"),
		path.resolve(process.cwd(), "apps/server/drizzle"),
	];

	for (const candidateFolder of candidateFolders) {
		if (existsSync(path.join(candidateFolder, "meta", "_journal.json"))) {
			return candidateFolder;
		}
	}

	throw new Error(
		`Missing Drizzle migrations folder. Expected one of: ${candidateFolders.join(", ")}. Run 'pnpm -C apps/server dz:g' first.`,
	);
}

async function runDatabaseMigrations(): Promise<void> {
	const migrationsFolder = resolveMigrationsFolder();
	Logger.info("Database", `Applying database migrations from ${migrationsFolder}...`);
	await migrate(db, { migrationsFolder });
	Logger.info("Database", "Database migrations applied");
}

async function ensureTablesExist(): Promise<void> {
	const existingTables = await getExistingTables();

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

	await runDatabaseMigrations();
	await ensureTablesExist();
	Logger.info("Database", "Database initialization complete");
}

export { checkDatabaseConnection, db, ensureTablesExist, initializeDatabase, poolConnection, runDatabaseMigrations };

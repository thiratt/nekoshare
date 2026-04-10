import { sql } from "drizzle-orm";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql from "mysql2/promise";
import { existsSync } from "node:fs";
import path from "node:path";

import * as schema from "./schemas";

import { env } from "@/config/env";
import { Logger } from "@/infrastructure/logger";

const poolConnection = mysql.createPool({
	host: env.DATABASE.host,
	port: env.DATABASE.port,
	user: env.DATABASE.user,
	...(env.DATABASE.password === undefined ? {} : { password: env.DATABASE.password }),
	database: env.DATABASE.database,
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

const migrationsTableName = "__drizzle_migrations";

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

async function ensureMigrationsTableExists(): Promise<void> {
	await db.execute(sql`
		create table if not exists ${sql.identifier(migrationsTableName)} (
			id serial primary key,
			hash text not null,
			created_at bigint
		)
	`);
}

async function getAppliedMigrationCount(): Promise<number> {
	const result = await db.execute(sql`select count(*) as count from ${sql.identifier(migrationsTableName)}`);
	const rows = result[0] as unknown as Array<{ count: number | string | bigint }>;
	return Number(rows[0]?.count ?? 0);
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

async function bootstrapMigrationHistoryIfNeeded(migrationsFolder: string): Promise<void> {
	const existingTables = await getExistingTables();
	const userTables = existingTables.filter((tableName) => tableName !== migrationsTableName);

	if (userTables.length === 0) {
		return;
	}

	await ensureMigrationsTableExists();

	if ((await getAppliedMigrationCount()) > 0) {
		return;
	}

	const missingTables = requiredTables.filter((tableName) => !existingTables.includes(tableName));
	if (missingTables.length > 0) {
		throw new Error(
			`Database contains existing tables (${userTables.join(", ")}) but has no Drizzle migration history and is missing required tables (${missingTables.join(", ")}). Use a clean database or align ${migrationsTableName} manually.`,
		);
	}

	const migrations = readMigrationFiles({ migrationsFolder });
	if (migrations.length === 0) {
		return;
	}

	Logger.warn(
		"Database",
		`Existing schema detected without ${migrationsTableName}. Bootstrapping migration history from local files.`,
	);

	for (const migration of migrations) {
		await db.execute(
			sql`insert into ${sql.identifier(migrationsTableName)} (${sql.identifier("hash")}, ${sql.identifier("created_at")}) values (${migration.hash}, ${migration.folderMillis})`,
		);
	}

	Logger.info("Database", "Drizzle migration history bootstrapped");
}

async function runDatabaseMigrations(): Promise<void> {
	const migrationsFolder = resolveMigrationsFolder();
	await bootstrapMigrationHistoryIfNeeded(migrationsFolder);
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

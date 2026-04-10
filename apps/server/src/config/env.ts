import dotenv from "dotenv";
import { existsSync } from "node:fs";
import path from "node:path";

type NodeEnv = "development" | "production" | "test";

type DatabaseConfig = {
	host: string;
	port: number;
	user: string;
	password?: string;
	database: string;
};

type RedisConfig = {
	host: string;
	port: number;
	username?: string;
	password?: string;
	database: number;
};

const HTTP_PORT = 7780;
const TCP_SOCKET_PORT = 7781;

const LOCAL_DEV_ALLOWED_ORIGINS = [
	"http://127.0.0.1:7780",
	"http://localhost:7780",
	"http://127.0.0.1:7785",
	"http://localhost:7785",
	"http://127.0.0.1:7786",
	"http://localhost:7786",
	"http://127.0.0.1:7787",
	"http://localhost:7787",
] as const;

const TAURI_ALLOWED_ORIGINS = ["http://tauri.localhost", "https://tauri.localhost", "tauri://localhost"] as const;

function loadEnvFiles(): void {
	const cwd = process.cwd();
	const mode = process.env.NODE_ENV?.trim() === "production" ? "production" : "local";
	const prioritizedEnvPath = path.resolve(cwd, `.env.${mode}`);

	if (!existsSync(prioritizedEnvPath)) {
		return;
	}

	dotenv.config({ path: prioritizedEnvPath, quiet: true });
}

loadEnvFiles();

function readRawEnvVar(name: string): string | undefined {
	return process.env[name];
}

function readEnvVar(name: string): string | undefined {
	const value = readRawEnvVar(name);
	if (value === undefined) {
		return undefined;
	}

	const trimmed = value.trim();
	return trimmed === "" ? undefined : trimmed;
}

function readOptionalRawEnvVar(name: string): string | undefined {
	const value = readRawEnvVar(name);
	if (value === undefined || value.length === 0) {
		return undefined;
	}

	return value;
}

function requireEnvVar(name: string): string {
	const value = readEnvVar(name);
	if (value === undefined) {
		throw new Error(`Missing required environment variable: ${name}`);
	}

	return value;
}

function requireSecretEnvVar(name: string): string {
	const value = readRawEnvVar(name);
	if (value === undefined || value.length === 0) {
		throw new Error(`Missing required environment variable: ${name}`);
	}

	return value;
}

function requireIntegerEnvVar(name: string, options?: { min?: number; max?: number }): number {
	const value = requireEnvVar(name);
	if (!/^-?\d+$/.test(value)) {
		throw new Error(`Invalid integer in ${name}: ${value}`);
	}

	const parsed = Number.parseInt(value, 10);
	if (!Number.isSafeInteger(parsed)) {
		throw new Error(`Invalid integer in ${name}: ${value}`);
	}

	if (options?.min !== undefined && parsed < options.min) {
		throw new Error(`${name} must be greater than or equal to ${options.min}. Received: ${value}`);
	}

	if (options?.max !== undefined && parsed > options.max) {
		throw new Error(`${name} must be less than or equal to ${options.max}. Received: ${value}`);
	}

	return parsed;
}

function readOptionalIntegerEnvVar(name: string, options?: { min?: number; max?: number }): number | undefined {
	const value = readEnvVar(name);
	if (value === undefined) {
		return undefined;
	}

	if (!/^-?\d+$/.test(value)) {
		throw new Error(`Invalid integer in ${name}: ${value}`);
	}

	const parsed = Number.parseInt(value, 10);
	if (!Number.isSafeInteger(parsed)) {
		throw new Error(`Invalid integer in ${name}: ${value}`);
	}

	if (options?.min !== undefined && parsed < options.min) {
		throw new Error(`${name} must be greater than or equal to ${options.min}. Received: ${value}`);
	}

	if (options?.max !== undefined && parsed > options.max) {
		throw new Error(`${name} must be less than or equal to ${options.max}. Received: ${value}`);
	}

	return parsed;
}

function normalizeAllowedOrigin(value: string, name: string): string {
	let url: URL;

	try {
		url = new URL(value);
	} catch {
		throw new Error(`Invalid origin in ${name}: ${value}`);
	}

	if (!["http:", "https:", "tauri:"].includes(url.protocol)) {
		throw new Error(`Invalid origin protocol in ${name}: ${value}`);
	}

	if (url.search || url.hash) {
		throw new Error(`Origins in ${name} must not include query strings or fragments: ${value}`);
	}

	if (url.protocol === "tauri:") {
		if (url.pathname !== "/" && url.pathname !== "") {
			throw new Error(`Tauri origins in ${name} must not include a path: ${value}`);
		}

		return `${url.protocol}//${url.hostname}`;
	}

	if (url.pathname !== "/" && url.pathname !== "") {
		throw new Error(`Origins in ${name} must not include a path: ${value}`);
	}

	return url.origin;
}

function normalizeHttpOrigin(value: string, name: string): string {
	const origin = normalizeAllowedOrigin(value, name);
	if (!origin.startsWith("http://") && !origin.startsWith("https://")) {
		throw new Error(`${name} must be an http(s) origin: ${value}`);
	}

	return origin;
}

function parseOriginList(name: string): string[] {
	const value = readEnvVar(name);
	if (!value) {
		return [];
	}

	return value
		.split(",")
		.map((item) => item.trim())
		.filter((item) => item.length > 0)
		.map((item) => normalizeAllowedOrigin(item, name));
}

function uniqueValues(values: readonly string[]): string[] {
	return [...new Set(values)];
}

function getNodeEnv(): NodeEnv {
	const value = readEnvVar("NODE_ENV") ?? "development";

	if (value === "development" || value === "production" || value === "test") {
		return value;
	}

	throw new Error(`Invalid NODE_ENV: ${value}`);
}

function getNodeId(): string {
	return readEnvVar("NODE_ID") ?? `node_${process.pid}_${Math.random().toString(36).slice(2, 8)}`;
}

function getDatabaseConfig(): DatabaseConfig {
	return {
		host: requireEnvVar("DATABASE_HOST"),
		port: requireIntegerEnvVar("DATABASE_PORT", { min: 1, max: 65535 }),
		user: requireEnvVar("DATABASE_USER"),
		password: readOptionalRawEnvVar("DATABASE_PASSWORD"),
		database: requireEnvVar("DATABASE_NAME"),
	};
}

function getRedisConfig(): RedisConfig {
	return {
		host: requireEnvVar("REDIS_HOST"),
		port: requireIntegerEnvVar("REDIS_PORT", { min: 1, max: 65535 }),
		username: readOptionalRawEnvVar("REDIS_USERNAME"),
		password: readOptionalRawEnvVar("REDIS_PASSWORD"),
		database: readOptionalIntegerEnvVar("REDIS_DB", { min: 0 }) ?? 0,
	};
}

function readOptionalEmailConfig() {
	const apiKey = readRawEnvVar("RESEND_API_KEY");
	const fromEmail = readEnvVar("RESEND_FROM_EMAIL");

	if ((apiKey && !fromEmail) || (!apiKey && fromEmail)) {
		throw new Error("RESEND_API_KEY and RESEND_FROM_EMAIL must be provided together.");
	}

	return {
		RESEND_API_KEY: apiKey,
		RESEND_FROM_EMAIL: fromEmail,
	};
}

const NODE_ENV = getNodeEnv();
const DATABASE = getDatabaseConfig();
const REDIS = getRedisConfig();
const APP_PUBLIC_URL = normalizeHttpOrigin(requireEnvVar("APP_PUBLIC_URL"), "APP_PUBLIC_URL");
const BETTER_AUTH_URL = normalizeHttpOrigin(requireEnvVar("BETTER_AUTH_URL"), "BETTER_AUTH_URL");
const DEPLOYMENT_ALLOWED_ORIGINS = parseOriginList("APP_ALLOWED_ORIGINS");
const DEFAULT_ALLOWED_ORIGINS =
	NODE_ENV === "production" ? [...TAURI_ALLOWED_ORIGINS] : [...LOCAL_DEV_ALLOWED_ORIGINS, ...TAURI_ALLOWED_ORIGINS];
const { RESEND_API_KEY, RESEND_FROM_EMAIL } = readOptionalEmailConfig();

const env = {
	NODE_ENV,
	PORT: HTTP_PORT,
	TCP_SOCKET_PORT,
	NODE_ID: getNodeId(),
	DATABASE,
	REDIS,
	GOOGLE_CLIENT_ID: requireEnvVar("GOOGLE_CLIENT_ID"),
	GOOGLE_CLIENT_SECRET: requireSecretEnvVar("GOOGLE_CLIENT_SECRET"),
	BETTER_AUTH_SECRET: requireSecretEnvVar("BETTER_AUTH_SECRET"),
	BETTER_AUTH_URL,
	APP_PUBLIC_URL,
	ALLOWED_ORIGINS: uniqueValues([
		APP_PUBLIC_URL,
		BETTER_AUTH_URL,
		...DEFAULT_ALLOWED_ORIGINS,
		...DEPLOYMENT_ALLOWED_ORIGINS,
	]),
	RESEND_API_KEY,
	RESEND_FROM_EMAIL,
} as const;

export { env };

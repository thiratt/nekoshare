import { createClient } from "redis";

import { env } from "@/config/env";
import { Logger } from "@/infrastructure/logger";

type RedisClient = ReturnType<typeof createClient>;

let redisClient: RedisClient | null = null;

function buildClient(): RedisClient {
	const client = createClient({
		socket: {
			host: env.REDIS_HOST,
			port: env.REDIS_PORT,
		},
		password: env.REDIS_PASSWORD,
	});

	client.on("error", (error) => {
		Logger.error("Redis", "Redis client error", error);
	});

	return client;
}

function getOrCreateClient(): RedisClient {
	if (!redisClient) {
		redisClient = buildClient();
	}
	return redisClient;
}

export async function initializeRedis(): Promise<RedisClient> {
	const client = getOrCreateClient();
	if (!client.isOpen) {
		await client.connect();
		Logger.info("Redis", `Redis connected`);
	}

	return client;
}

export async function closeRedis(): Promise<void> {
	if (!redisClient) {
		return;
	}

	if (redisClient.isOpen) {
		await redisClient.quit();
		Logger.info("Redis", "Redis connection closed");
	}
}

export function getRedisClient(): RedisClient {
	return getOrCreateClient();
}

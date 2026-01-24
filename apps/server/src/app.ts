import { Hono } from "hono";
import { cors } from "hono/cors";
import { poweredBy } from "hono/powered-by";
import { logger } from "hono/logger";
import { serve, type ServerType } from "@hono/node-server";

import "dotenv/config";

import { onError } from "./core/exception/hono";
import authMiddleware from "./core/middleware/auth";
import { Logger, nekoShareLogger } from "./core/logger";
import { createWebSocketInstance } from "./core/socket/ws";
import { env } from "./config/env";

import rootRouter from "@/routes/root";
import authRouter from "@/routes/auth";
import accountRouter from "@/routes/account";
import devicesRouter from "@/routes/devices";
import friendsRouter from "@/routes/friends";

const CORS_CONFIG = {
	origin: (origin: string) => {
		const allowedOrigins = [
			"http://localhost:7787",
			"http://127.0.0.1:7787",
			"http://tauri.localhost",
			"tauri://localhost",
		];

		if (allowedOrigins.includes(origin) || !origin) {
			return origin;
		}

		return null;
	},
	allowHeaders: ["Content-Type", "Authorization"],
	allowMethods: ["GET", "HEAD", "PUT", "POST", "PATCH", "DELETE", "OPTIONS"],
	exposeHeaders: ["Content-Length"],
	maxAge: 600,
	credentials: true,
};

const SERVER_CONFIG = {
	hostname: "0.0.0.0",
	// hostname: env.HOSTNAME ?? "0.0.0.0",
	port: env.PORT,
} as const;

export async function createApp(): Promise<ServerType> {
	const app = new Hono();

	app.use("*", cors(CORS_CONFIG));
	app.use(authMiddleware);
	app.use(logger(nekoShareLogger));
	app.use(poweredBy({ serverName: "Nekoshare Server" }));

	app.onError(onError);

	const routes = [
		["/", rootRouter],
		["/auth", authRouter],
		["/account", accountRouter],
		["/devices", devicesRouter],
		["/friends", friendsRouter],
	] as const;

	for (const [path, router] of routes) {
		app.route(path, router);
	}

	const webSocketInstance = await createWebSocketInstance(app);

	return new Promise<ServerType>((resolve, reject) => {
		try {
			const httpServer: ServerType = serve(
				{
					fetch: app.fetch,
					...SERVER_CONFIG,
				},
				(info) => {
					Logger.info("APP", `HTTP Server started on ${info.address}:${info.port}`);
				},
			);

			webSocketInstance(httpServer);

			resolve(httpServer);
		} catch (error) {
			Logger.error("APP", "Failed to start server", error);
			reject(error);
		}
	});
}

export async function shutdownApp(server: ServerType): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		Logger.info("APP", "Shutting down server gracefully...");

		server.close((err) => {
			if (err) {
				Logger.error("APP", "Error during shutdown", err);
				reject(err);
			} else {
				Logger.info("APP", "Server shut down successfully");
				resolve();
			}
		});
	});
}

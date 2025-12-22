import { Hono } from "hono";
import { cors } from "hono/cors";
import { poweredBy } from "hono/powered-by";
import { logger } from "hono/logger";

import "dotenv/config";
import { onError } from "./core/exception/hono";
import authMiddleWare from "./core/middleware/auth";

import authRouter from "@/routes/auth";
import accountRouter from "@/routes/account";
import devicesRouter from "@/routes/devices";
import friendsRouter from "@/routes/friends";

import { Logger, nekoShareLogger } from "./core/logger";
import { serve, type ServerType } from "@hono/node-server";
import { env } from "./config/env";
import { createWebSocketInstance } from "./core/socket/ws";

export async function createApp(): Promise<ServerType> {
	const app = new Hono();
	const webSocketInstance = await createWebSocketInstance(app);

	app.use(
		"*",
		cors({
			origin: "http://localhost:7787",
			allowHeaders: ["Content-Type", "Authorization"],
			allowMethods: ["GET", "HEAD", "PUT", "POST", "PATCH", "DELETE", "OPTIONS"],
			exposeHeaders: ["Content-Length"],
			maxAge: 600,
			credentials: true,
		})
	);
	app.use(authMiddleWare);

	app.use(logger(nekoShareLogger));
	app.use(poweredBy({ serverName: `Nekoshare Server` }));
	app.onError(onError);

	app.route("/auth", authRouter);
	app.route("/account", accountRouter);
	app.route("/devices", devicesRouter);
	app.route("/friends", friendsRouter);

	return new Promise<ServerType>((resolve) => {
		const httpServer = serve({ fetch: app.fetch, hostname: "0.0.0.0", port: env.PORT }, (info) => {
			Logger.info("APP", `HTTP Server running started on port ${info.port}`);
		});
		webSocketInstance(httpServer);
		resolve(httpServer);
	});
}

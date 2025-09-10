import { Hono } from "hono";
import { cors } from "hono/cors";
import { poweredBy } from "hono/powered-by";
import { pinoLogger } from "hono-pino";
import { pino } from "pino";

import "dotenv/config";
import { onError } from "./config/hono";
import authMiddleWare from "./core/middleware/auth";

import authRouter from "@/routes/auth";
import accountRouter from "@/routes/account";

import { APP_NAME } from "@workspace/app-config/app/index";

export function createApp() {
	const app = new Hono();

	app.use(
		"*",
		cors({
			origin: "http://localhost:3000",
			allowHeaders: ["Content-Type", "Authorization"],
			allowMethods: ["POST", "GET", "OPTIONS"],
			exposeHeaders: ["Content-Length"],
			maxAge: 600,
			credentials: true,
		})
	);
	app.use(authMiddleWare);
	app.use(
		pinoLogger({
			pino: pino({
				transport: {
					target: "pino-pretty", // Use pino-pretty for formatting
					options: {
						colorize: true, // Enable colorized output
					},
				},
			}),
		})
	);
	// app.use(logger(nekoShareLogger));
	app.use(poweredBy({ serverName: `${APP_NAME} Server` }));
	app.onError(onError);

	app.route("/auth", authRouter);
	app.route("/account", accountRouter);

	return app;
}

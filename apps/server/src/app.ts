import { Hono } from "hono";
import { cors } from "hono/cors";
import { poweredBy } from "hono/powered-by";
import { logger } from "hono/logger";

import "dotenv/config";
import { onError } from "./core/exception/hono";
import authMiddleWare from "./core/middleware/auth";

import authRouter from "@/routes/auth";
import accountRouter from "@/routes/account";

import { nekoShareLogger } from "./core/logger";

export function createApp() {
	const app = new Hono();

	app.use("*", cors());
	app.use(authMiddleWare);

	app.use(logger(nekoShareLogger));
	app.use(poweredBy({ serverName: `Nekoshare Server` }));
	app.onError(onError);

	app.route("/auth", authRouter);
	app.route("/account", accountRouter);

	return app;
}

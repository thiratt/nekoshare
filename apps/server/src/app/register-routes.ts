import type { Hono } from "hono";

import type { AppModuleRouters } from "./create-module-routes";

export function registerRoutes(app: Hono, routers: AppModuleRouters) {
	app.route("/", routers.root);
	app.route("/auth", routers.auth);
	app.route("/account", routers.account);
	app.route("/devices", routers.devices);
	app.route("/friends", routers.friends);
}

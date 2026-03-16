import { createRootController } from "./root.controller";
import { RootService } from "./root.service";

import { createRouter } from "@/shared/http/router";

export function createRootRouter(service: RootService) {
	const app = createRouter();
	const controller = createRootController(service);

	app.get("/", controller.health);

	return app;
}

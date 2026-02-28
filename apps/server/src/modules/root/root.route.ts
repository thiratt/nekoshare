import { createRouter } from "@/shared/http/router";

import { createRootController } from "./root.controller";
import { RootService } from "./root.service";

export function createRootRouter(service: RootService) {
	const app = createRouter();
	const controller = createRootController(service);

	app.get("/", controller.health);

	return app;
}

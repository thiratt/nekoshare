import { createRouter } from "@/shared/http/router";

import { createDevicesController } from "./devices.controller";
import { DevicesService } from "./devices.service";

export function createDevicesRouter(service: DevicesService) {
	const controller = createDevicesController(service);
	const app = createRouter();

	app.get("/", controller.list);
	app.post("/register", controller.register);
	app.patch("/:id", controller.update);
	app.delete("/:id", controller.remove);

	return app;
}

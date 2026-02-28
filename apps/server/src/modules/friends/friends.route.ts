import { createRouter } from "@/shared/http/router";

import { createFriendsController } from "./friends.controller";
import { FriendsService } from "./friends.service";

export function createFriendsRouter(service: FriendsService) {
	const controller = createFriendsController(service);
	const app = createRouter();

	app.get("/", controller.list);
	app.post("/request", controller.request);
	app.patch("/:id/accept", controller.accept);
	app.delete("/:id/reject", controller.reject);
	app.delete("/:id/cancel", controller.cancel);
	app.delete("/:id", controller.remove);
	app.get("/search", controller.search);

	return app;
}

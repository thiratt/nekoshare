import { createAccountController } from "./account.controller";
import { AccountService } from "./account.service";

import { createRouter } from "@/shared/http/router";

export function createAccountRouter(service: AccountService) {
	const app = createRouter();
	const controller = createAccountController(service);

	app.get("/session", controller.session);

	return app;
}

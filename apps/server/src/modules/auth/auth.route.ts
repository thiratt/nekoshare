import { createRouter } from "@/shared/http/router";

import type { authController } from "./auth.controller";

type AuthController = Pick<typeof authController, "handle">;

export function createAuthRouter(controller: AuthController) {
	const app = createRouter();

	app.on(["POST", "GET"], "*", controller.handle);

	return app;
}

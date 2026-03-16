import type { authController } from "./auth.controller";

import { createRouter } from "@/shared/http/router";

type AuthController = Pick<
	typeof authController,
	"handle" | "handleDesktopGoogleStart" | "handleGoogleCallback" | "handleMobileGoogleAuth"
>;

export function createAuthRouter(controller: AuthController) {
	const app = createRouter();

	app.post("/mobile/google", controller.handleMobileGoogleAuth);
	app.get("/desktop/google/start", controller.handleDesktopGoogleStart);
	app.get("/callback/google", controller.handleGoogleCallback);
	app.on(["POST", "GET"], "*", controller.handle);

	return app;
}

import type { authController } from "./auth.controller";

import { createRouter } from "@/shared/http/router";

type AuthController = Pick<
	typeof authController,
	| "handle"
	| "handleAppChallengeConsume"
	| "handleAppEmailSignIn"
	| "handleAppEmailSignUp"
	| "handleAppGoogleContinue"
	| "handleAppGoogleLink"
	| "handleAppPasswordHelp"
	| "handleAppPasswordSetup"
	| "handleAppResultExchange"
	| "handleDesktopGoogleStart"
	| "handleGoogleCallback"
	| "handleMobileGoogleAuth"
>;

export function createAuthRouter(controller: AuthController) {
	const app = createRouter();

	app.post("/app/email/sign-in", controller.handleAppEmailSignIn);
	app.post("/app/email/sign-up", controller.handleAppEmailSignUp);
	app.post("/app/password/help", controller.handleAppPasswordHelp);
	app.get("/app/challenge/consume", controller.handleAppChallengeConsume);
	app.post("/app/password/setup", controller.handleAppPasswordSetup);
	app.post("/app/result/exchange", controller.handleAppResultExchange);
	app.post("/app/provider/google/continue", controller.handleAppGoogleContinue);
	app.post("/app/provider/google/link", controller.handleAppGoogleLink);
	app.get("/app/provider/google/desktop/start", controller.handleDesktopGoogleStart);
	app.get("/app/provider/google/callback", controller.handleGoogleCallback);
	app.post("/mobile/google", controller.handleMobileGoogleAuth);
	app.get("/desktop/google/start", controller.handleDesktopGoogleStart);
	app.get("/callback/google", controller.handleGoogleCallback);
	app.on(["POST", "GET"], "*", controller.handle);

	return app;
}

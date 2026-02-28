import { authController } from "./auth.controller";
import { createAuthRouter } from "./auth.route";

export type AuthModule = {
	controller: typeof authController;
	router: ReturnType<typeof createAuthRouter>;
};

export function createAuthModule(): AuthModule {
	return {
		controller: authController,
		router: createAuthRouter(authController),
	};
}

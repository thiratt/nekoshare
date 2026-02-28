import { createRootRouter } from "./root.route";
import { RootService } from "./root.service";

export type RootModule = {
	service: RootService;
	router: ReturnType<typeof createRootRouter>;
};

export function createRootModule(): RootModule {
	const service = new RootService();

	return {
		service,
		router: createRootRouter(service),
	};
}

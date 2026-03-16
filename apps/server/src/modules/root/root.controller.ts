import { RootService } from "./root.service";

import type { AppContext } from "@/shared/http/router";

export function createRootController(service: RootService) {
	return {
		health(c: AppContext) {
			return c.json(service.getHealthMessage());
		},
	};
}

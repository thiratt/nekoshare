import type { AppContext } from "@/shared/http/router";

import { RootService } from "./root.service";

export function createRootController(service: RootService) {
	return {
		health(c: AppContext) {
			return c.json(service.getHealthMessage());
		},
	};
}

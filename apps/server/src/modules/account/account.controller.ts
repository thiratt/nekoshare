import { AccountService } from "./account.service";

import { jsonSuccess } from "@/shared/http";
import type { AppContext } from "@/shared/http/router";

export function createAccountController(service: AccountService) {
	return {
		session(c: AppContext) {
			const session = c.get("session");
			const user = c.get("user");

			return jsonSuccess(c, service.getSessionPayload(session, user));
		},
	};
}

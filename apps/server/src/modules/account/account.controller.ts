import type { AppContext } from "@/shared/http/router";
import { jsonSuccess } from "@/shared/http";

import { AccountService } from "./account.service";

export function createAccountController(service: AccountService) {
	return {
		session(c: AppContext) {
			const session = c.get("session");
			const user = c.get("user");

			return jsonSuccess(c, service.getSessionPayload(session, user));
		},
	};
}

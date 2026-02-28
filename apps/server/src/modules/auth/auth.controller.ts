import { auth } from "@/modules/auth/lib";
import type { AppContext } from "@/shared/http/router";

export const authController = {
	handle(c: AppContext) {
		return auth.handler(c.req.raw);
	},
};

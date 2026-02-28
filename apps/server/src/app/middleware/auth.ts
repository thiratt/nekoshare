import { createMiddleware } from "hono/factory";

import { auth, type AuthenticatedType } from "@/modules/auth/lib";
import { error } from "@/types";

const authMiddleWare = createMiddleware<{ Variables: AuthenticatedType }>(async (c, next) => {
	const session = await auth.api.getSession({ headers: c.req.raw.headers });
	c.header("Server", "NekoShare");

	if (c.req.path.includes("/auth/")) {
		return next();
	}

	if (!session) {
		return c.json(error("Unauthorized", "Please login to access this resource"), 401);
	}

	c.set("user", session.user);
	c.set("session", session.session);
	return next();
});

export default authMiddleWare;

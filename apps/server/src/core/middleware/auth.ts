import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import { auth } from "@/core/auth";
import { createMiddleware } from "hono/factory";

// const authMiddleWare = new Hono<{
// 	Variables: {
// 		user: typeof auth.$Infer.Session.user | null;
// 		session: typeof auth.$Infer.Session.session | null;
// 	};
// }>();

const authMiddleWare = createMiddleware(async (c, next) => {
	const session = await auth.api.getSession({ headers: c.req.raw.headers });
	c.header("Server", "NekoShare");
	if (!session) {
		c.set("user", null);
		c.set("session", "null");
		return next();
	}

	c.set("user", session.user);
	c.set("session", session.session);
	return next();
});

export default authMiddleWare;

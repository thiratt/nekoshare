import { auth } from "@/core/auth";
import { createMiddleware } from "hono/factory";

const authMiddleWare = createMiddleware(async (c, next) => {
	const session = await auth.api.getSession({ headers: c.req.raw.headers });
	c.header("Server", "NekoShare");
	if (!session) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	c.set("user", session.user);
	c.set("session", session.session);
	return next();
});

export default authMiddleWare;

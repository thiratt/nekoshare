import { Hono } from "hono";

import type { AuthType } from "@/core/auth";

const app = new Hono<{ Variables: AuthType }>();

app.get("/session", (c) => {
	const session = c.get("session");
	const user = c.get("user");

	if (!user) return c.json({ status: "failed" }, 401);

	return c.json({
		session,
		user,
	});
});

export default app;

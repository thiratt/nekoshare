import { Hono } from "hono";

import type { AuthenticatedType } from "@/core/auth";
import { success } from "@/types";

const app = new Hono<{ Variables: AuthenticatedType }>();

app.get("/session", (c) => {
	const session = c.get("session");
	const user = c.get("user");

	return c.json(success({ session, user }));
});

export default app;

import { createRouter } from "@/core/utils/router";
import { success } from "@/types";

const app = createRouter();

app.get("/session", (c) => {
	const session = c.get("session");
	const user = c.get("user");

	return c.json(success({ session, user }));
});

export default app;

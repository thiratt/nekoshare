import { auth } from "@/core/auth";
import { createRouter } from "@/core/utils/router";

const app = createRouter();

app.on(["POST", "GET"], "*", (c) => {
	return auth.handler(c.req.raw);
});

export default app;

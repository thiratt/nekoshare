import { createRouter } from "@/core/utils/router";

const app = createRouter();

app.get("/", async (c) => {
	return c.json({ message: "Nekoshare Server is running." });
});

export default app;

import { serve, type ServerType } from "@hono/node-server";
import { createApp } from "./app";
import { env } from "./config/env";

function createServer(): ServerType {
	const app = createApp();

	return serve({ fetch: app.fetch, port: env.PORT }, (info) => {
		console.log(`🚀 Server running at http://localhost:${info.port}`);
	});
}

const server = createServer();

process.on("SIGINT", async () => {
	console.log("Shutting down server...");
	server.close();
	process.exit(0);
});

process.on("SIGTERM", () => {
	server.close((err) => {
		if (err) {
			console.error(err);
			process.exit(1);
		}
		process.exit(0);
	});
});

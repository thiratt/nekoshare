import { serve } from "@hono/node-server";
import { createApp } from "./app";
import { env } from "./config/env";
// import { createRedis } from "./adapters/redis";
// import { attachWs } from "./adapters/ws/handler";

async function main() {
	const app = createApp();
	const server = serve({ fetch: app.fetch, port: env.PORT });

	// ถ้าใช้ ws แบบ native uWebSockets/undici upgrade → ติดตั้ง handler ที่นี่
	// attachWs(server);

	console.log(`API running on http://localhost:${env.PORT}`);
}
main();

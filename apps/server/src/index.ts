import { serve, type ServerType } from "@hono/node-server";
import { createApp } from "./app";
import { env } from "./config/env";
import { startSocketServer, type TCPFileServer } from "./core/socket";

let httpServer: ServerType | null = null;
let socketServer: TCPFileServer | null = null;

async function startServers(): Promise<void> {
	try {
		console.log("🔌 Starting TCP socket server...");
		socketServer = await startSocketServer();

		console.log("🌐 Starting HTTP server...");
		const app = createApp();
		httpServer = serve({ fetch: app.fetch, hostname: "0.0.0.0", port: env.PORT }, (info) => {
			console.log(`HTTP Server running at http://${info.address}:${info.port}`);
		});
	} catch (error) {
		console.error("Failed to start servers:", error);
		process.exit(1);
	}
}

async function shutdown(signal: string): Promise<void> {
	console.log(`\n${signal} received. Shutting down servers...`);

	try {
		if (httpServer) {
			await new Promise<void>((resolve, reject) => {
				httpServer!.close((err) => {
					if (err) {
						console.error("Error stopping HTTP server:", err);
						reject(err);
					} else {
						console.log("HTTP server stopped");
						resolve();
					}
				});
			});
		}

		if (socketServer) {
			await socketServer.stop();
			console.log("TCP socket server stopped");
		}

		console.log("All servers stopped gracefully");
		process.exit(0);
	} catch (error) {
		console.error("Error during shutdown:", error);
		process.exit(1);
	}
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

startServers();

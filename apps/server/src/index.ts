import { type ServerType } from "@hono/node-server";
import { createApp, shutdownApp } from "./app";
import { Logger } from "./core/logger";
import type { TCPFileServer } from "./core/socket/tcp";

let httpServer: ServerType | null = null;
let socketServer: TCPFileServer | null = null;

async function startServers(): Promise<void> {
	try {
		Logger.info("Main", "Starting HTTP server...");
		httpServer = await createApp();

		// Logger.info("Main", "Starting TCP socket server...");
		// socketServer = await startSocketServer();
	} catch (error) {
		console.error("Failed to start servers:", error);
		process.exit(1);
	}
}

async function shutdown(signal: string): Promise<void> {
	console.log(`\n${signal} received. Shutting down servers...`);

	try {
		if (httpServer) {
			await shutdownApp(httpServer);
			console.log("HTTP server stopped");
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

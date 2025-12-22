import { type ServerType } from "@hono/node-server";
import { createApp } from "./app";
import { startSocketServer, type TCPFileServer } from "./core/socket/tcp";
import { Logger } from "./core/logger";

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

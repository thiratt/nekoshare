import type { ServerType } from "@hono/node-server";
import type { Server as NetServer } from "net";

import { createApp, shutdownApp } from "@/app/create-app";
import { env } from "./config/env";
import { initializeDatabase } from "./infrastructure/db";
import { Logger, LogLevel } from "./infrastructure/logger";
import { createTCPSocketInstance } from "./infrastructure/socket/transport/tcp";

let httpServer: ServerType | null = null;
let socketServer: NetServer | null = null;

async function startServers(): Promise<void> {
	try {
		if (env.NODE_ENV === "development") {
			Logger.setLevel(LogLevel.DEBUG);
		}

		Logger.info("Main", "Checking database connection and schema...");
		await initializeDatabase();

		Logger.info("Main", "Starting HTTP server...");
		httpServer = await createApp();

		Logger.info("Main", "Starting TCP socket server...");
		socketServer = await createTCPSocketInstance();
	} catch (error) {
		Logger.error("Main", "Failed to start servers", error);
		process.exit(1);
	}
}

function closeSocketServer(server: NetServer): Promise<void> {
	return new Promise((resolve, reject) => {
		server.close((err) => {
			if (err) {
				reject(err);
				return;
			}
			resolve();
		});
	});
}

async function shutdown(signal: string): Promise<void> {
	Logger.info("Main", `${signal} received. Shutting down servers...`);

	try {
		if (httpServer) {
			await shutdownApp(httpServer);
			Logger.info("Main", "HTTP server stopped");
		}

		if (socketServer) {
			await closeSocketServer(socketServer);
			Logger.info("Main", "TCP socket server stopped");
		}

		Logger.info("Main", "All servers stopped gracefully");
		process.exit(0);
	} catch (error) {
		Logger.error("Main", "Error during shutdown", error);
		process.exit(1);
	}
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

startServers();

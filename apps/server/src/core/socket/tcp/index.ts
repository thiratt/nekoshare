export { TCPFileServer } from "./server";
export { ConnectionManager } from "./connection";
export { RelayManager } from "./relay";
export * from "./types";
export { MESSAGE_TYPES, DELIMITERS, RELAY_COMMANDS, RESPONSE_CODES, RESPONSES, DEFAULT_CONFIG } from "./constants";

import { TCPFileServer } from "./server";
import { DEFAULT_CONFIG } from "./constants";
import { Logger } from "@/core/logger";

export async function startSocketServer(): Promise<TCPFileServer> {
	const server = new TCPFileServer(DEFAULT_CONFIG);

	const shutdown = async () => {
		Logger.info("Main", "Received shutdown signal");
		await server.stop();
		process.exit(0);
	};

	process.on("SIGTERM", shutdown);
	process.on("SIGINT", shutdown);

	await server.start();

	return server;
}

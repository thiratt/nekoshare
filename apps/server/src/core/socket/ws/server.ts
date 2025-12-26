import { createNodeWebSocket } from "@hono/node-ws";
import { Logger } from "@/core/logger";
import type { User } from "@/core/auth";
import type { createRouter } from "@/core/utils/router";

import { Connection } from "./connection";
import { UserController } from "./controllers/user.controller";
import { SystemController } from "./controllers/sys.controller";
import { globalSessionManager } from "./session";
import { PacketType } from "./protocol";

function bootstrapControllers() {
	SystemController.init();
	UserController.init();
	Logger.info("WebSocket", "All controllers initialized.");
}

export async function createWebSocketInstance(app: ReturnType<typeof createRouter>, path: string = "/ws") {
	bootstrapControllers();

	const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

	app.get(
		path,
		upgradeWebSocket((c) => {
			let connection: Connection | undefined;

			return {
				async onOpen(evt, ws) {
					try {
						const currentUser = c.get("user") as User;
						if (!currentUser) {
							ws.close(1008, "Unauthorized");
							return;
						}

						Logger.info("WebSocket", `User ${currentUser.name} connected via WebSocket.`);
						connection = new Connection(currentUser.id, ws, globalSessionManager);
						globalSessionManager.addSession(connection);

						connection.sendPacket(PacketType.SYSTEM_HANDSHAKE);
					} catch (error) {
						if (connection) {
							const msg = error instanceof Error ? error.message : "Unknown error";
							Logger.error("WebSocket", `Connection error: ${msg}`);
							connection.close();
						}
						ws.close(1008, "Internal Error");
					}
				},

				onMessage(evt, ws) {
					if (connection) {
						const data = evt.data instanceof ArrayBuffer ? evt.data : Buffer.from(evt.data as string);
						connection.handleMessage(data);
					}
				},

				onClose(evt, ws) {
					if (connection) {
						connection.close();
					}
					Logger.info("WebSocket", `WebSocket connection closed (code: ${evt.code}).`);
				},
			};
		})
	);

	Logger.info("WebSocket", `WebSocket server initialized at path: ${path}`);
	return injectWebSocket;
}

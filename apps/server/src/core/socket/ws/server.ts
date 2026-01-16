import { createNodeWebSocket } from "@hono/node-ws";
import { randomUUID } from "node:crypto";
import { Logger } from "@/core/logger";
import type { User } from "@/core/auth";
import type { createRouter } from "@/core/utils/router";
import { PacketType } from "../shared";
import { WSConnection, wsSessionManager, bootstrapWSControllers } from "./connection";

export async function createWebSocketInstance(app: ReturnType<typeof createRouter>, path: string = "/ws") {
	bootstrapWSControllers();

	const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

	app.get(
		path,
		upgradeWebSocket((c) => {
			let connection: WSConnection | undefined;

			return {
				async onOpen(evt, ws) {
					try {
						const currentUser = c.get("user") as User;
						if (!currentUser) {
							ws.close(1008, "Unauthorized");
							return;
						}

						Logger.info("WebSocket", `User ${currentUser.name} connected via WebSocket.`);
						connection = new WSConnection(randomUUID(), ws);

						connection.setAuthenticated({
							session: c.get("session"),
							user: currentUser,
						});

						wsSessionManager.addSession(connection);

						connection.sendPacket(PacketType.SYSTEM_HANDSHAKE, 0);
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

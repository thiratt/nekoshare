import { Hono } from "hono";
import { createNodeWebSocket } from "@hono/node-ws";
import { Logger } from "@/core/logger";

export async function createWebSocketInstance(app: Hono, path: string = "/ws"): Promise<typeof injectWebSocket> {
	const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

	app.get(
		path,
		upgradeWebSocket((c) => ({
			onOpen(evt, ws) {
				console.log("WebSocket connection opened:", evt);
			},
			onClose(evt, ws) {
				console.log("WebSocket connection closed:", evt);
			},
		}))
	);

	Logger.info("WebSocket", `WebSocket server initialized at path: ${path}`);
	return injectWebSocket;
}

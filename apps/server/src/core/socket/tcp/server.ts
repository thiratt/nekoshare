import { createServer, Server as NetServer, Socket } from "net";
import { Logger } from "@/core/logger";

import { Connection } from "./connection";
import { AuthController } from "./controllers/auth.controller";
import { UserController } from "./controllers/user.controller";
import { SystemController } from "./controllers/sys.controller";
import { globalSessionManager } from "./session";
import { PacketType } from "./protocol";
import { env } from "@/config/env";

function bootstrapControllers() {
	AuthController.init();
	SystemController.init();
	UserController.init();
	Logger.info("TCP", "All controllers initialized.");
}

export async function createTCPSocketInstance() {
	bootstrapControllers();

	const port = env.TCP_SOCKET_PORT;
	const server: NetServer = createServer((socket: Socket) => {
		let connection: Connection | undefined;
		const clientId = `tcp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

		try {
			Logger.info("TCP", `Client ${clientId} connected via TCP.`);
			connection = new Connection(clientId, socket, globalSessionManager);
			globalSessionManager.addSession(connection);

			connection.sendPacket(PacketType.SYSTEM_HANDSHAKE, 0);
		} catch (error) {
			if (connection) {
				const msg = error instanceof Error ? error.message : "Unknown error";
				Logger.error("TCP", `Connection error: ${msg}`);
				connection.close();
			}
			socket.destroy();
			return;
		}

		socket.on("data", (data: Buffer) => {
			if (connection) {
				connection.handleMessage(data);
			}
		});

		socket.on("close", () => {
			if (connection) {
				connection.close();
			}
			Logger.info("TCP", `TCP connection closed.`);
		});

		socket.on("error", (error) => {
			Logger.error("TCP", `Socket error: ${error.message}`);
		});
	});

	server.listen(port, () => {
		Logger.info("TCP", `TCP server initialized at port: ${port}`);
	});

	return server;
}

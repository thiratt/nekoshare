import { createServer, Server as NetServer, Socket } from "net";
import { Logger } from "@/core/logger";
import { PacketType } from "../shared";
import { TCPConnection, tcpSessionManager, bootstrapTCPControllers } from "./connection";
import { env } from "@/config/env";

export async function createTCPSocketInstance() {
	bootstrapTCPControllers();

	const port = env.TCP_SOCKET_PORT;
	const server: NetServer = createServer((socket: Socket) => {
		let connection: TCPConnection | undefined;
		const clientId = `tcp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

		try {
			Logger.info("TCP", `Client ${clientId} connected via TCP.`);
			connection = new TCPConnection(clientId, socket);
			tcpSessionManager.addSession(connection);

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

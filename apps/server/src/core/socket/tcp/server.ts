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

		let inputBuffer = Buffer.alloc(0);

		socket.on("data", (data: Buffer) => {
			if (!connection) return;

			inputBuffer = Buffer.concat([inputBuffer, data]);

			while (true) {
				if (inputBuffer.length < 4) {
					break;
				}

				const frameLength = inputBuffer.readUInt32LE(0);

				if (inputBuffer.length < 4 + frameLength) {
					break;
				}

				const frame = inputBuffer.subarray(4, 4 + frameLength);

				try {
					connection.handleMessage(frame);
				} catch (err) {
					Logger.error("TCP", `Error handling frame: ${err}`);
				}

				inputBuffer = inputBuffer.subarray(4 + frameLength);
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

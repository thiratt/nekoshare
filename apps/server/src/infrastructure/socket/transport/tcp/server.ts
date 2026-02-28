import { createServer, Server as NetServer, Socket } from "net";
import { eq } from "drizzle-orm";

import { env } from "@/config/env";
import { db } from "@/infrastructure/db";
import { device } from "@/infrastructure/db/schemas";
import { Logger } from "@/infrastructure/logger";
import { handleDeviceSocketDisconnect } from "@/infrastructure/socket/modules/peer";
import { HEADER_SIZE, MAX_FRAME_SIZE } from "@/infrastructure/socket/protocol/frame";
import { PacketType } from "@/infrastructure/socket/protocol/packet-type";
import { generateConnectionId } from "@/infrastructure/socket/runtime/connection-id";

import { bootstrapTcpTransport } from "./bootstrap";
import { TCPConnection, tcpSessionManager } from "./connection";

export async function createTCPSocketInstance() {
	bootstrapTcpTransport();

	const port = env.TCP_SOCKET_PORT;
	const server: NetServer = createServer((socket: Socket) => {
		let connection: TCPConnection | undefined;
		const clientId = generateConnectionId("tcp");

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
				if (frameLength < HEADER_SIZE || frameLength > MAX_FRAME_SIZE) {
					Logger.warn(
						"TCP",
						`Invalid frame length ${frameLength} from ${clientId} (allowed: ${HEADER_SIZE}-${MAX_FRAME_SIZE})`,
					);
					inputBuffer = Buffer.alloc(0);
					if (connection) {
						connection.close();
						connection = undefined;
					}
					socket.destroy();
					return;
				}

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
				const sessionId = connection.session?.id;
				if (sessionId) {
					db.query.device
						.findFirst({
							where: eq(device.currentSessionId, sessionId),
							columns: { id: true },
						})
						.then((deviceInfo) => {
							if (!deviceInfo) {
								Logger.warn(
									"TCP",
									`No device found for session ${sessionId} during disconnect cleanup`,
								);
								return;
							}

							handleDeviceSocketDisconnect(deviceInfo.id);
						})
						.catch((err) => {
							Logger.warn(
								"TCP",
								`Failed to resolve device for session ${sessionId}: ${err?.message || err}`,
							);
						});
				}
				connection.close();
			}
			Logger.info("TCP", "TCP connection closed.");
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

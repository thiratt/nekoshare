import { Hono } from "hono";
import { createNodeWebSocket } from "@hono/node-ws";
import { Logger } from "@/core/logger";
import type { WSContext } from "hono/ws";
import { auth } from "@/core/auth";

interface Users {
	id: string;
	socket: WSContext<WebSocket>;
	peerId?: string;
	roomId?: string;
}

interface Rooms {
	id: string;
	participants: string[];
}

const DELIMITERS = {
	FIELD: ":",
	SUBFIELD: "-",
	CONDITION: "\\|",
	END: `\n`,
} as const;

const MESSAGE_TYPES = {
	COMMAND: "CMD",
	RESPONSE: "RES",
	DATA: "DAT",
	JSON: "JSON",
} as const;

const COMMANDS = {
	REGISTER: "REG",
	GET_USERS: "GUSRS",
	PEER_DISCONNECTED: "PRDCN",
	MESSAGE: "MSG",
	PING: "PING",
	PONG: "PONG",
} as const;

const RESPONSES = {
	REG: (clientId: string) =>
		`${MESSAGE_TYPES.RESPONSE}${DELIMITERS.FIELD}${COMMANDS.REGISTER}${DELIMITERS.SUBFIELD}${clientId}${DELIMITERS.END}`,
	GET_USERS: (userIds: string) =>
		`${MESSAGE_TYPES.RESPONSE}${DELIMITERS.FIELD}${COMMANDS.GET_USERS}${DELIMITERS.SUBFIELD}${userIds}${DELIMITERS.END}`,
	PEER_DISCONNECTED: (roomId: string) =>
		`${MESSAGE_TYPES.RESPONSE}${DELIMITERS.FIELD}${COMMANDS.PEER_DISCONNECTED}${DELIMITERS.SUBFIELD}${roomId}${DELIMITERS.END}`,
	// TODO: Implement error handling for commands
	ERROR: (command: keyof typeof COMMANDS) =>
		`${MESSAGE_TYPES.RESPONSE}${DELIMITERS.FIELD}${command}|ERROR${DELIMITERS.END}`,
	UNKNOWN_COMMAND: (command: string) =>
		`${MESSAGE_TYPES.RESPONSE}${DELIMITERS.FIELD}UNKNOWN_COMMAND|${command}${DELIMITERS.END}`,
	PONG: `${MESSAGE_TYPES.RESPONSE}${DELIMITERS.FIELD}${COMMANDS.PONG}${DELIMITERS.END}`,
} as const;

const users: Users[] = [];
const rooms: Rooms[] = [];

function broadcastUserList() {
	users.forEach((user) => {
		const otherUsers = users.filter((u) => u.id !== user.id);
		if (otherUsers.length === 0) {
			user.socket.send(RESPONSES.GET_USERS("0"));
		} else {
			const userIds = otherUsers.map((u) => u.id).join(",");
			user.socket.send(RESPONSES.GET_USERS(userIds));
		}
	});
}

export async function createWebSocketInstance(app: Hono, path: string = "/ws"): Promise<typeof injectWebSocket> {
	const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

	app.get(
		path,
		upgradeWebSocket((c) => ({
			async onOpen(evt, ws) {
				const token = c.req.header("sec-websocket-protocol");
				if (!token) {
					ws.close(1008, "Missing token");
					return;
				}

				const verificationResult = await auth.api.verifyOneTimeToken({ body: { token } });

				if (!verificationResult.user || !verificationResult.session) {
					ws.close(1008, "Invalid token");
					return;
				}

				console.log("WebSocket authenticated for user:", verificationResult.user.name);

				const userId = crypto.randomUUID().split("-")[0];
				users.push({ id: userId, socket: ws });
				ws.send(RESPONSES.REG(userId));
				// broadcastUserList();
			},
			onMessage(evt, ws) {
				const data = evt.data;
				console.log("WebSocket message received:", data);
				if (typeof data === "string") {
					const [type, payload] = data.split(DELIMITERS.FIELD);

					switch (type) {
						case MESSAGE_TYPES.COMMAND:
							// TODO: Implement command handling
							break;

						default:
							Logger.warn("WebSocket", `Unknown message type received: ${type}`);
							ws.send(RESPONSES.UNKNOWN_COMMAND(type));
							break;
					}
				}
			},
			onClose(evt, ws) {
				const disconnectedUser = users.find((user) => user.socket === ws);

				if (disconnectedUser) {
					rooms.forEach((room) => {
						if (room.participants.includes(disconnectedUser.id)) {
							const peerId = room.participants.find((p) => p !== disconnectedUser.id);
							if (peerId) {
								const peerUser = users.find((u) => u.id === peerId);
								if (peerUser) {
									peerUser.socket.send(RESPONSES.PEER_DISCONNECTED(room.id));
								}
							}

							const roomIndex = rooms.findIndex((r) => r.id === room.id);
							if (roomIndex !== -1) {
								rooms.splice(roomIndex, 1);
							}
						}
					});
				}

				const index = users.findIndex((user) => user.socket === ws);
				if (index !== -1) {
					users.splice(index, 1);

					broadcastUserList();
				}

				console.log("WebSocket disconnected");
			},
		}))
	);

	Logger.info("WebSocket", `WebSocket server initialized at path: ${path}`);
	return injectWebSocket;
}

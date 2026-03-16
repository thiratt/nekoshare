import { createNodeWebSocket } from "@hono/node-ws";
import { eq } from "drizzle-orm";

import { bootstrapWsTransport } from "./bootstrap";
import { WSConnection, wsSessionManager } from "./connection";

import { db } from "@/infrastructure/db";
import { device } from "@/infrastructure/db/schemas";
import { Logger } from "@/infrastructure/logger";
import { initializeWsPubSub } from "@/infrastructure/socket/events/ws-pubsub";
import {
	broadcastDeviceOffline,
	broadcastDeviceOnline,
	broadcastUserOffline,
	broadcastUserOnline,
	getUserFriendIds,
} from "@/infrastructure/socket/modules/friend";
import { handleDeviceSocketDisconnect } from "@/infrastructure/socket/modules/peer";
import { registerUserPresenceSession, unregisterUserPresenceSession } from "@/infrastructure/socket/presence";
import { PacketType } from "@/infrastructure/socket/protocol/packet-type";
import { generateConnectionId } from "@/infrastructure/socket/runtime/connection-id";
import type { User } from "@/modules/auth/lib";
import type { createRouter } from "@/shared/http/router";

function getForwardedClientIp(forwardedHeader: string | undefined): string | undefined {
	if (!forwardedHeader) {
		return undefined;
	}

	const first = forwardedHeader.split(",")[0]?.trim();
	return first || undefined;
}

export async function createWebSocketInstance(app: ReturnType<typeof createRouter>, path: string = "/ws") {
	bootstrapWsTransport();
	await initializeWsPubSub();

	const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

	app.get(
		path,
		upgradeWebSocket((c) => {
			let connection: WSConnection | undefined;
			let presenceRegistered = false;

			const getRemoteIp = (): string | undefined => {
				const forwardedIp = getForwardedClientIp(c.req.header("x-forwarded-for"));
				if (forwardedIp) {
					return forwardedIp;
				}

				const realIp = c.req.header("x-real-ip");
				if (realIp) {
					return realIp;
				}

				return undefined;
			};

			return {
				async onOpen(evt, ws) {
					try {
						const currentUser = c.get("user") as User;
						if (!currentUser) {
							ws.close(1008, "Unauthorized");
							return;
						}

						const remoteIp = getRemoteIp();
						Logger.info(
							"WebSocket",
							`User ${currentUser.name} connected via WebSocket from ${remoteIp || "unknown"}.`,
						);
						const connectionId = generateConnectionId("ws");
						connection = new WSConnection(connectionId, ws, remoteIp);

						connection.setAuthenticated({
							session: c.get("session"),
							user: currentUser,
						});

						wsSessionManager.addSession(connection);
						const becameOnline = await registerUserPresenceSession(currentUser.id);
						presenceRegistered = true;
						connection.sendPacket(PacketType.SYSTEM_HANDSHAKE, 0);

						if (becameOnline) {
							getUserFriendIds(currentUser.id)
								.then((friendIds) => {
									if (friendIds.length > 0) {
										broadcastUserOnline(currentUser.id, friendIds);
									}
								})
								.catch((err) => {
									Logger.warn(
										"WebSocket",
										`Failed to broadcast online state for user ${currentUser.id}: ${err?.message || err}`,
									);
								});
						}

						const session = c.get("session");
						if (session?.id) {
							db.query.device
								.findFirst({
									where: eq(device.currentSessionId, session.id),
									columns: { id: true },
								})
								.then((deviceInfo) => {
									if (deviceInfo) {
										broadcastDeviceOnline(currentUser.id, deviceInfo.id, connectionId);
									}
								})
								.catch((err) => {
									Logger.warn(
										"WebSocket",
										`Failed to get device info for online broadcast: ${err.message}`,
									);
								});
						}
					} catch (error) {
						if (connection) {
							const msg = error instanceof Error ? error.message : "Unknown error";
							Logger.error("WebSocket", `Connection error: ${msg}`);
							connection.close();
						}
						ws.close(1008, "Internal Error");
					}
				},

				onMessage(evt) {
					if (connection) {
						const data = evt.data instanceof ArrayBuffer ? evt.data : Buffer.from(evt.data as string);
						connection.handleMessage(data);
					}
				},

				onClose(evt) {
					if (connection) {
						const userId = connection.user?.id;
						const sessionId = connection.session?.id;

						const deviceInfoPromise = sessionId
							? db.query.device
									.findFirst({
										where: eq(device.currentSessionId, sessionId),
										columns: { id: true },
									})
									.catch((err) => {
										Logger.warn(
											"WebSocket",
											`Failed to resolve device for session ${sessionId}: ${err?.message || err}`,
										);
										return undefined;
									})
							: undefined;

						if (deviceInfoPromise) {
							deviceInfoPromise.then((deviceInfo) => {
								if (!deviceInfo) {
									return;
								}

								void handleDeviceSocketDisconnect(deviceInfo.id).catch((err) => {
									Logger.warn(
										"WebSocket",
										`Failed to cleanup peer state for device ${deviceInfo.id}: ${err?.message || err}`,
									);
								});

								if (userId) {
									broadcastDeviceOffline(userId, deviceInfo.id);
								}
							});
						}

						connection.close();

						if (userId && presenceRegistered) {
							presenceRegistered = false;
							registerPresenceOfflineFlow(userId);
						}
					}
					Logger.info("WebSocket", `WebSocket connection closed (code: ${evt.code}).`);
				},
			};
		}),
	);

	Logger.info("WebSocket", `WebSocket server initialized at path: ${path}`);
	return injectWebSocket;
}

function registerPresenceOfflineFlow(userId: string): void {
	unregisterUserPresenceSession(userId)
		.then((becameOffline) => {
			if (!becameOffline) {
				return;
			}

			return getUserFriendIds(userId).then((friendIds) => {
				if (friendIds.length > 0) {
					broadcastUserOffline(userId, friendIds);
				}
			});
		})
		.catch((err) => {
			Logger.warn("WebSocket", `Failed to broadcast offline state for user ${userId}: ${err?.message || err}`);
		});
}

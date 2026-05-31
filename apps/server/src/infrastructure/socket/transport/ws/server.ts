import { createNodeWebSocket } from "@hono/node-ws";

import { bootstrapWsTransport } from "./bootstrap";
import { WSConnection, wsSessionManager } from "./connection";

import { Logger } from "@/infrastructure/logger";
import { registerRelayWebSocketRoute } from "@/infrastructure/relay";
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
import { DeviceIdentityService, deviceIdentityRepository, type ResolvedDeviceIdentity } from "@/modules/devices";
import type { createRouter } from "@/shared/http/router";

const deviceIdentityService = new DeviceIdentityService(deviceIdentityRepository);

function getForwardedClientIp(forwardedHeader: string | undefined): string | undefined {
	if (!forwardedHeader) {
		return undefined;
	}

	const first = forwardedHeader.split(",")[0]?.trim();
	return first || undefined;
}

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

async function resolveControlWsDeviceIdentity(input: {
	sessionId: string | undefined;
	userId: string;
}): Promise<ResolvedDeviceIdentity | undefined> {
	if (!input.sessionId) {
		return undefined;
	}

	return deviceIdentityService.resolveHttpDevice({
		sessionId: input.sessionId,
		userId: input.userId,
	});
}

async function resolveDisconnectDeviceIdentity(
	connection: WSConnection,
): Promise<ResolvedDeviceIdentity | undefined> {
	const sessionId = connection.session?.id;
	if (!sessionId) {
		return undefined;
	}

	try {
		const identity = await deviceIdentityService.findDeviceBySessionId(sessionId);
		if (identity && connection.user?.id && identity.userId !== connection.user.id) {
			return undefined;
		}

		return identity;
	} catch (err) {
		Logger.warn("WebSocket", `Failed to resolve device for session ${sessionId}: ${getErrorMessage(err)}`);
		return undefined;
	}
}

export async function createWebSocketInstance(app: ReturnType<typeof createRouter>, path: string = "/ws") {
	bootstrapWsTransport();
	await initializeWsPubSub();

	const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });
	registerRelayWebSocketRoute(app, upgradeWebSocket);

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
						const session = c.get("session");
						let deviceIdentity: ResolvedDeviceIdentity | undefined;
						try {
							deviceIdentity = await resolveControlWsDeviceIdentity({
								sessionId: session?.id,
								userId: currentUser.id,
							});
							if (deviceIdentity) {
								Logger.debug(
									"WebSocket",
									`Resolved control WS device ${deviceIdentity.deviceId} for user ${deviceIdentity.userId}`,
								);
							} else {
								Logger.debug("WebSocket", `No control WS device resolved for user ${currentUser.id}`);
							}
						} catch (err) {
							Logger.warn(
								"WebSocket",
								`Device identity resolution failed for user ${currentUser.id}: ${getErrorMessage(err)}`,
							);
						}

						const authenticatedUser = deviceIdentity
							? ({ ...currentUser, deviceId: deviceIdentity.deviceId } as User)
							: currentUser;

						connection.setAuthenticated({
							deviceIdentity,
							session,
							user: authenticatedUser,
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

						if (deviceIdentity) {
							broadcastDeviceOnline(currentUser.id, deviceIdentity.deviceId, connectionId);
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

						resolveDisconnectDeviceIdentity(connection).then((deviceIdentity) => {
							if (!deviceIdentity) {
								return;
							}

							void handleDeviceSocketDisconnect(deviceIdentity.deviceId).catch((err) => {
								Logger.warn(
									"WebSocket",
									`Failed to cleanup peer state for device ${deviceIdentity.deviceId}: ${err?.message || err}`,
								);
							});

							if (userId) {
								broadcastDeviceOffline(userId, deviceIdentity.deviceId);
							}
						}).catch((err) => {
							Logger.warn(
								"WebSocket",
								`Failed to resolve device identity during disconnect: ${err?.message || err}`,
							);
						});

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

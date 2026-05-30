import { createNodeWebSocket } from "@hono/node-ws";
import { randomUUID } from "node:crypto";

import { relaySessionManager } from "./relay-session-manager";

import { Logger } from "@/infrastructure/logger";
import { getRedisClient } from "@/infrastructure/redis";
import { createTransferService, RedisTransferRuntimeStore, type TransferRuntimeRedisClient } from "@/modules/transfers";
import type { createRouter } from "@/shared/http/router";

type RelayUpgradeWebSocket = ReturnType<typeof createNodeWebSocket>["upgradeWebSocket"];

let relayTransferService: ReturnType<typeof createTransferService> | null = null;

function getRelayTransferService() {
	if (!relayTransferService) {
		relayTransferService = createTransferService({
			devices: {
				findSenderDevice: async () => undefined,
				findUserSummary: async () => undefined,
				findDeviceFingerprint: async () => undefined,
			},
			lifecycle: {
				registerTransferOffer: async () => ({ ok: false, reason: "Unsupported in relay transport" }),
				ensureTransferParticipants: async () => undefined,
				markTransferAccepted: async () => undefined,
				removeTransferSession: async () => undefined,
				resolveTransferForAck: async () => undefined,
				getTransferSessionForFallback: async () => undefined,
			},
			runtimeStore: new RedisTransferRuntimeStore(getRedisClient() as unknown as TransferRuntimeRedisClient),
			onRuntimeError(operation, error) {
				Logger.warn("Relay", `Failed to ${operation}`, error);
			},
		});
	}

	return relayTransferService;
}

function getBearerToken(header: string | undefined): string | undefined {
	if (!header) {
		return undefined;
	}

	const [scheme, token] = header.split(" ");
	if (scheme?.toLowerCase() !== "bearer") {
		return undefined;
	}

	return token?.trim() || undefined;
}

export function registerRelayWebSocketRoute(
	app: ReturnType<typeof createRouter>,
	upgradeWebSocket: RelayUpgradeWebSocket,
	path = "/ws/relay",
): void {
	app.get(
		path,
		upgradeWebSocket((c) => {
			let connectionId: string | undefined;

			return {
				async onOpen(_evt, ws) {
					const token = getBearerToken(c.req.header("authorization")) ?? c.req.query("token")?.trim();
					if (!token) {
						ws.close(1008, "Relay token required");
						return;
					}

					const verification = await getRelayTransferService().verifyRelayTicket(token);
					if (!verification) {
						ws.close(1008, "Invalid relay token");
						return;
					}

					const { ticket } = verification;
					connectionId = randomUUID();
					relaySessionManager.bindPeer(connectionId, {
						transferId: ticket.transferId,
						role: ticket.role,
						userId: ticket.userId,
						deviceId: ticket.deviceId,
					});

					Logger.info(
						"Relay",
						`Relay ${ticket.role} connected for transfer ${ticket.transferId} (${ticket.deviceId})`,
					);

					if (relaySessionManager.hasBothPeers(ticket.transferId)) {
						await getRelayTransferService().markRelayPeersConnected(ticket.transferId);
					}
				},

				onMessage(_evt, ws) {
					ws.close(1003, "Relay streaming is not implemented");
				},

				onClose() {
					if (!connectionId) {
						return;
					}

					const peer = relaySessionManager.removePeer(connectionId);
					if (!peer) {
						return;
					}

					Logger.info("Relay", `Relay ${peer.role} disconnected for transfer ${peer.transferId}`);
					void getRelayTransferService().markRelayPeerDisconnected(peer.transferId);
				},
			};
		}),
	);

	Logger.info("Relay", `Relay WebSocket route initialized at path: ${path}`);
}

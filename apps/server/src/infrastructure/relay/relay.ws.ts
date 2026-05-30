import { createNodeWebSocket } from "@hono/node-ws";
import { randomUUID } from "node:crypto";

import { relaySessionManager } from "./relay-session-manager";

import { Logger } from "@/infrastructure/logger";
import { getRedisClient } from "@/infrastructure/redis";
import { createTransferService, RedisTransferRuntimeStore, type TransferRuntimeRedisClient } from "@/modules/transfers";
import type { createRouter } from "@/shared/http/router";

type RelayUpgradeWebSocket = ReturnType<typeof createNodeWebSocket>["upgradeWebSocket"];

// Note: The relay WebSocket implementation is designed to be as thin as possible,
// simply forwarding binary messages between the sender and receiver peers.
const MAX_RELAY_MESSAGE_BYTES = 8 * 1024 * 1024;
const PROGRESS_INTERVAL_MS = 250;
const PROGRESS_BYTES_INTERVAL = 1024 * 1024;

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

function getBinaryMessageData(data: unknown): ArrayBuffer | Buffer | undefined {
	if (data instanceof ArrayBuffer) {
		return data;
	}

	if (Buffer.isBuffer(data)) {
		return data;
	}

	return undefined;
}

function getBinaryLength(data: ArrayBuffer | Buffer): number {
	return Buffer.isBuffer(data) ? data.byteLength : data.byteLength;
}

function sendBinaryData(peer: { sendBinary(data: ArrayBuffer | Buffer): void }, data: ArrayBuffer | Buffer): void {
	peer.sendBinary(data);
}

function shouldFlushProgress(transferId: string): boolean {
	const session = relaySessionManager.getSession(transferId);
	if (!session) {
		return false;
	}

	const now = Date.now();
	return (
		now - session.lastProgressAt >= PROGRESS_INTERVAL_MS ||
		session.bytesRelayed - session.lastProgressBytes >= PROGRESS_BYTES_INTERVAL
	);
}

function flushProgressIfNeeded(transferId: string): void {
	if (!shouldFlushProgress(transferId)) {
		return;
	}

	const session = relaySessionManager.markProgressFlushed(transferId, Date.now());
	if (!session) {
		return;
	}

	void getRelayTransferService().recordRelayProgress(transferId, session.bytesRelayed);
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
						close(reason) {
							ws.close(1011, reason);
						},
						sendBinary(data) {
							ws.send(data instanceof ArrayBuffer ? data : Uint8Array.from(data));
						},
					});

					Logger.info(
						"Relay",
						`Relay ${ticket.role} connected for transfer ${ticket.transferId} (${ticket.deviceId})`,
					);

					if (relaySessionManager.hasBothPeers(ticket.transferId)) {
						await getRelayTransferService().markRelayPeersConnected(ticket.transferId);
					}
				},

				onMessage(evt, ws) {
					try {
						if (!connectionId) {
							ws.close(1008, "Relay peer is not bound");
							return;
						}

						const peer = relaySessionManager.getPeer(connectionId);
						if (!peer) {
							ws.close(1008, "Relay peer is not active");
							return;
						}

						const data = getBinaryMessageData(evt.data);
						if (!data) {
							ws.close(1003, "Relay only accepts binary frames");
							return;
						}

						if (peer.role !== "sender") {
							ws.close(1008, "Receiver cannot send relay payload bytes");
							return;
						}

						const byteLength = getBinaryLength(data);
						if (byteLength > MAX_RELAY_MESSAGE_BYTES) {
							ws.close(1009, "Relay message is too large");
							return;
						}

						const receiver = relaySessionManager.getCounterpart(peer);
						if (!receiver) {
							ws.close(1011, "Relay receiver is not connected");
							return;
						}

						sendBinaryData(receiver, data);
						relaySessionManager.addRelayedBytes(peer.transferId, byteLength);
						flushProgressIfNeeded(peer.transferId);
					} catch (error) {
						Logger.warn("Relay", "Failed to process relay message", error);
						ws.close(1011, "Relay message failed");
					}
				},

				onClose() {
					try {
						if (!connectionId) {
							return;
						}

						const peer = relaySessionManager.removePeer(connectionId);
						if (!peer) {
							return;
						}

						const counterpart = relaySessionManager.getCounterpart(peer);
						if (counterpart) {
							counterpart.close("Relay counterpart disconnected");
						}

						Logger.info("Relay", `Relay ${peer.role} disconnected for transfer ${peer.transferId}`);
						void getRelayTransferService().markRelayPeerDisconnected(peer.transferId);
					} catch (error) {
						Logger.warn("Relay", "Failed to cleanup relay peer", error);
					}
				},
			};
		}),
	);

	Logger.info("Relay", `Relay WebSocket route initialized at path: ${path}`);
}

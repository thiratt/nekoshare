import type { Socket } from "net";
import type { RelayClient } from "./types";
import { RESPONSES } from "./constants";
import { Logger } from "../logger";

export class RelayManager {
	private clients: Map<number, RelayClient> = new Map();
	private clientIdCounter = 0;

	registerClient(socket: Socket): number {
		const clientId = ++this.clientIdCounter;

		const client: RelayClient = {
			clientId,
			socket,
			peerId: null,
			connectedAt: new Date(),
		};

		this.clients.set(clientId, client);

		socket.write(RESPONSES.WELCOME(clientId));

		Logger.info("RelayManager", `Client registered`, { clientId, totalClients: this.clients.size });

		return clientId;
	}

	unregisterClient(clientId: number): void {
		const client = this.clients.get(clientId);
		if (!client) return;

		if (client.peerId) {
			this.disconnectPeers(clientId, client.peerId);
		}

		this.clients.delete(clientId);
		Logger.info("RelayManager", `Client unregistered`, { clientId, totalClients: this.clients.size });
	}

	getOnlineClients(excludeClientId: number): number[] {
		return Array.from(this.clients.keys()).filter((id) => id !== excludeClientId);
	}

	handleListCommand(clientId: number): void {
		const client = this.clients.get(clientId);
		if (!client) return;

		const onlineClients = this.getOnlineClients(clientId);
		client.socket.write(RESPONSES.CLIENTS(onlineClients));

		Logger.debug("RelayManager", `Sent client list`, {
			clientId,
			onlineClients: onlineClients.join(","),
		});
	}

	handleConnectCommand(clientId: number, targetId: number): void {
		const client = this.clients.get(clientId);
		const target = this.clients.get(targetId);

		if (!client) {
			Logger.warn("RelayManager", `Connect failed - client not found`, { clientId });
			return;
		}

		if (!target) {
			client.socket.write(RESPONSES.ERROR("Target client not found"));
			Logger.warn("RelayManager", `Connect failed - target not found`, { clientId, targetId });
			return;
		}

		if (client.peerId) {
			client.socket.write(RESPONSES.ERROR("Already connected to another client"));
			Logger.warn("RelayManager", `Connect failed - already connected`, {
				clientId,
				currentPeerId: client.peerId,
			});
			return;
		}

		client.peerId = targetId;
		target.peerId = clientId;

		client.socket.write(RESPONSES.CONNECTED(targetId));
		target.socket.write(RESPONSES.PEER_CONNECTED(clientId));

		Logger.info("RelayManager", `Clients connected`, { clientId, targetId });
	}

	disconnectPeers(clientId: number, peerId: number): void {
		const client = this.clients.get(clientId);
		const peer = this.clients.get(peerId);

		if (client) {
			client.peerId = null;
			try {
				client.socket.write(RESPONSES.DISCONNECTED);
			} catch (error) {
				Logger.warn("RelayManager", `Failed to send disconnect to client`, { clientId, error });
			}
		}

		if (peer) {
			peer.peerId = null;
			try {
				peer.socket.write(RESPONSES.PEER_DISCONNECTED);
			} catch (error) {
				Logger.warn("RelayManager", `Failed to send peer disconnect notification`, { peerId, error });
			}
		}

		Logger.info("RelayManager", `Peers disconnected`, { clientId, peerId });
	}

	handleDisconnectCommand(clientId: number): void {
		const client = this.clients.get(clientId);
		if (!client || !client.peerId) {
			Logger.debug("RelayManager", `Disconnect - no peer connection`, { clientId });
			return;
		}

		this.disconnectPeers(clientId, client.peerId);
	}

	relayMessage(clientId: number, message: string): void {
		const client = this.clients.get(clientId);
		if (!client || !client.peerId) {
			Logger.debug("RelayManager", `Relay message failed - not connected`, { clientId });
			return;
		}

		const peer = this.clients.get(client.peerId);
		if (!peer) {
			Logger.warn("RelayManager", `Relay message failed - peer not found`, {
				clientId,
				peerId: client.peerId,
			});
			return;
		}

		peer.socket.write(RESPONSES.MESSAGE(message));
		Logger.debug("RelayManager", `Message relayed`, {
			from: clientId,
			to: client.peerId,
			messagePreview: message.substring(0, 50),
		});
	}

	relayFileStart(clientId: number, filename: string, filesize: string, compress: string): void {
		const client = this.clients.get(clientId);
		if (!client || !client.peerId) {
			Logger.warn("RelayManager", `Relay file start failed - not connected`, { clientId });
			return;
		}

		const peer = this.clients.get(client.peerId);
		if (!peer) {
			Logger.warn("RelayManager", `Relay file start failed - peer not found`, {
				clientId,
				peerId: client.peerId,
			});
			return;
		}

		peer.socket.write(RESPONSES.FILE_START(filename, filesize, compress));
		Logger.info("RelayManager", `File start relayed`, {
			from: clientId,
			to: client.peerId,
			filename,
			filesize,
		});
	}

	relayFileEnd(clientId: number): void {
		const client = this.clients.get(clientId);
		if (!client || !client.peerId) {
			Logger.debug("RelayManager", `Relay file end failed - not connected`, { clientId });
			return;
		}

		const peer = this.clients.get(client.peerId);
		if (!peer) {
			Logger.warn("RelayManager", `Relay file end failed - peer not found`, {
				clientId,
				peerId: client.peerId,
			});
			return;
		}

		peer.socket.write(RESPONSES.FILE_END);
		Logger.info("RelayManager", `File end relayed`, { from: clientId, to: client.peerId });
	}

	relayData(clientId: number, data: Buffer): boolean {
		const client = this.clients.get(clientId);
		if (!client || !client.peerId) {
			return false;
		}

		const peer = this.clients.get(client.peerId);
		if (!peer) {
			Logger.warn("RelayManager", `Relay data failed - peer not found`, {
				clientId,
				peerId: client.peerId,
			});
			return false;
		}

		try {
			peer.socket.write(data);
			Logger.debug("RelayManager", `Data relayed`, {
				from: clientId,
				to: client.peerId,
				bytes: data.length,
			});
			return true;
		} catch (error) {
			Logger.error("RelayManager", `Failed to relay data`, {
				from: clientId,
				to: client.peerId,
				error,
			});
			return false;
		}
	}

	getClient(clientId: number): RelayClient | undefined {
		return this.clients.get(clientId);
	}

	isClientConnected(clientId: number): boolean {
		const client = this.clients.get(clientId);
		return !!client && client.peerId !== null;
	}

	getStats() {
		const totalClients = this.clients.size;
		const connectedPairs = Array.from(this.clients.values()).filter((c) => c.peerId !== null).length / 2;

		return {
			totalClients,
			connectedPairs,
			activeRelays: connectedPairs,
		};
	}

	cleanup(): void {
		Logger.info("RelayManager", `Cleaning up ${this.clients.size} relay clients`);

		for (const [clientId] of this.clients) {
			this.unregisterClient(clientId);
		}

		this.clients.clear();
		this.clientIdCounter = 0;
	}
}

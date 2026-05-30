import type { RelayPeer, RelayPeerIdentity, RelayTransferSession } from "./relay.types";

interface RelayPeerBinding extends RelayPeerIdentity {
	close(reason: string): void;
	sendBinary(data: ArrayBuffer | Buffer): void;
	sendText(message: string): void;
}

export class RelaySessionManager {
	private readonly sessions = new Map<string, RelayTransferSession>();
	private readonly connectionIndex = new Map<string, RelayPeer>();

	bindPeer(connectionId: string, binding: RelayPeerBinding): RelayTransferSession {
		const peer: RelayPeer = {
			...binding,
			connectionId,
			connectedAt: new Date().toISOString(),
		};
		const session = this.sessions.get(binding.transferId) ?? {
			transferId: binding.transferId,
			bytesRelayed: 0,
			lastProgressAt: 0,
			lastProgressBytes: 0,
		};
		session[binding.role] = peer;
		this.sessions.set(binding.transferId, session);
		this.connectionIndex.set(connectionId, peer);
		return session;
	}

	removePeer(connectionId: string): RelayPeer | undefined {
		const peer = this.connectionIndex.get(connectionId);
		if (!peer) {
			return undefined;
		}

		this.connectionIndex.delete(connectionId);
		const session = this.sessions.get(peer.transferId);
		if (!session) {
			return peer;
		}

		if (session[peer.role]?.connectionId === connectionId) {
			delete session[peer.role];
		}

		if (!session.sender && !session.receiver) {
			this.sessions.delete(peer.transferId);
		}

		return peer;
	}

	getSession(transferId: string): RelayTransferSession | undefined {
		return this.sessions.get(transferId);
	}

	getPeer(connectionId: string): RelayPeer | undefined {
		return this.connectionIndex.get(connectionId);
	}

	getCounterpart(peer: RelayPeer): RelayPeer | undefined {
		const session = this.sessions.get(peer.transferId);
		return peer.role === "sender" ? session?.receiver : session?.sender;
	}

	addRelayedBytes(transferId: string, byteLength: number): RelayTransferSession | undefined {
		const session = this.sessions.get(transferId);
		if (!session) {
			return undefined;
		}

		session.bytesRelayed += byteLength;
		return session;
	}

	markProgressFlushed(transferId: string, now: number): RelayTransferSession | undefined {
		const session = this.sessions.get(transferId);
		if (!session) {
			return undefined;
		}

		session.lastProgressAt = now;
		session.lastProgressBytes = session.bytesRelayed;
		return session;
	}

	hasBothPeers(transferId: string): boolean {
		const session = this.sessions.get(transferId);
		return Boolean(session?.sender && session.receiver);
	}
}

export const relaySessionManager = new RelaySessionManager();

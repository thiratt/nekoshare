import type { RelayPeer, RelayPeerIdentity, RelayTransferSession } from "./relay.types";

export class RelaySessionManager {
	private readonly sessions = new Map<string, RelayTransferSession>();
	private readonly connectionIndex = new Map<string, RelayPeer>();

	bindPeer(connectionId: string, identity: RelayPeerIdentity): RelayTransferSession {
		const peer: RelayPeer = {
			...identity,
			connectionId,
			connectedAt: new Date().toISOString(),
		};
		const session = this.sessions.get(identity.transferId) ?? { transferId: identity.transferId };
		session[identity.role] = peer;
		this.sessions.set(identity.transferId, session);
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

	hasBothPeers(transferId: string): boolean {
		const session = this.sessions.get(transferId);
		return Boolean(session?.sender && session.receiver);
	}
}

export const relaySessionManager = new RelaySessionManager();

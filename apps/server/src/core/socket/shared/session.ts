import { Logger } from "@/core/logger";
import type { IConnection, ISessionManager, TransportType } from "./types";

export class SessionManager<T extends IConnection> implements ISessionManager<T> {
	private sessions = new Map<string, T>();
	private transportType: TransportType;

	constructor(transportType: TransportType) {
		this.transportType = transportType;
	}

	addSession(connection: T) {
		if (this.sessions.has(connection.id)) {
			Logger.warn(this.transportType, `Duplicate login for ${connection.id}. Replacing session.`);
			const oldSession = this.sessions.get(connection.id);
			oldSession?.close();
		}
		this.sessions.set(connection.id, connection);
		Logger.debug(this.transportType, `User ${connection.id} connected. Total: ${this.sessions.size}`);
	}

	getSession(userId: string): T | undefined {
		return this.sessions.get(userId);
	}

	removeSession(userId: string) {
		if (this.sessions.has(userId)) {
			this.sessions.delete(userId);
			Logger.debug(this.transportType, `User ${userId} disconnected. Total: ${this.sessions.size}`);
		}
	}

	getSessionCount(): number {
		return this.sessions.size;
	}

	getAllSessions(): T[] {
		return Array.from(this.sessions.values());
	}

	broadcast(callback: (connection: T) => void) {
		for (const connection of this.sessions.values()) {
			callback(connection);
		}
	}
}

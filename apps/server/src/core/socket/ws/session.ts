import { Logger } from "@/core/logger";
import type { Connection, ISessionManager } from "./connection";

export class SessionManager implements ISessionManager {
	private sessions = new Map<string, Connection>();

	addSession(connection: Connection) {
		if (this.sessions.has(connection.id)) {
			Logger.warn("WebSocket", `Duplicate login for ${connection.id}. Replacing session.`);
			const oldSession = this.sessions.get(connection.id);
			oldSession?.close();
		}
		this.sessions.set(connection.id, connection);
		Logger.debug("WebSocket", `User ${connection.id} connected. Total: ${this.sessions.size}`);
	}

	getSession(userId: string): Connection | undefined {
		return this.sessions.get(userId);
	}

	removeSession(userId: string) {
		if (this.sessions.has(userId)) {
			this.sessions.delete(userId);
			Logger.debug("WebSocket", `User ${userId} disconnected. Total: ${this.sessions.size}`);
		}
	}
}

export const globalSessionManager = new SessionManager();

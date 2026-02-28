import { Logger } from "@/infrastructure/logger";
import type { IConnection, ISessionManager, TransportType } from "./types";

export class SessionManager<T extends IConnection> implements ISessionManager<T> {
	private sessions = new Map<string, T>();
	private userSessions = new Map<string, Set<string>>();
	private transportType: TransportType;

	constructor(transportType: TransportType) {
		this.transportType = transportType;
	}

	isUserOnline(userId: string): boolean {
		const sessions = this.userSessions.get(userId);
		return sessions !== undefined && sessions.size > 0;
	}

	getOnlineUserIds(): string[] {
		return Array.from(this.userSessions.keys());
	}

	addSession(connection: T) {
		this.sessions.set(connection.id, connection);

		if (connection.user?.id) {
			this.addUserSession(connection.user.id, connection.id);
		}

		Logger.debug(this.transportType, `Connection ${connection.id} added. Total: ${this.sessions.size}`);
	}

	private addUserSession(userId: string, connectionId: string) {
		if (!this.userSessions.has(userId)) {
			this.userSessions.set(userId, new Set());
		}
		this.userSessions.get(userId)!.add(connectionId);
	}

	getSession(connectionId: string): T | undefined {
		return this.sessions.get(connectionId);
	}

	getSessionsByUserId(userId: string): T[] {
		const connectionIds = this.userSessions.get(userId);
		if (!connectionIds) return [];

		const connections: T[] = [];
		for (const id of connectionIds) {
			const conn = this.sessions.get(id);
			if (conn) connections.push(conn);
		}
		return connections;
	}

	removeSession(connectionId: string) {
		const connection = this.sessions.get(connectionId);
		if (connection) {
			if (connection.user?.id) {
				const userSess = this.userSessions.get(connection.user.id);
				if (userSess) {
					userSess.delete(connectionId);
					if (userSess.size === 0) {
						this.userSessions.delete(connection.user.id);
					}
				}
			}
			this.sessions.delete(connectionId);
			Logger.debug(this.transportType, `Connection ${connectionId} disconnected. Total: ${this.sessions.size}`);
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

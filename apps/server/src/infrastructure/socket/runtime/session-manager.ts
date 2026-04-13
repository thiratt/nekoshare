import type { IConnection, ISessionManager, TransportType } from "./types";

import { Logger } from "@/infrastructure/logger";

export class SessionManager<T extends IConnection> implements ISessionManager<T> {
	private sessions = new Map<string, T>();
	private userSessions = new Map<string, Set<string>>();
	private sessionUserIds = new Map<string, string>();
	private transportType: TransportType;

	constructor(transportType: TransportType) {
		this.transportType = transportType;
	}

	isUserOnline(userId: string): boolean {
		return this.getSessionsByUserId(userId).length > 0;
	}

	getOnlineUserIds(): string[] {
		return Array.from(this.userSessions.keys()).filter((userId) => this.isUserOnline(userId));
	}

	addSession(connection: T) {
		this.sessions.set(connection.id, connection);
		this.bindSessionToUser(connection.id, connection.user?.id);

		Logger.debug(this.transportType, `Connection ${connection.id} added. Total: ${this.sessions.size}`);
	}

	private addUserSession(userId: string, connectionId: string) {
		if (!this.userSessions.has(userId)) {
			this.userSessions.set(userId, new Set());
		}
		this.userSessions.get(userId)!.add(connectionId);
		this.sessionUserIds.set(connectionId, userId);
	}

	private removeUserSession(connectionId: string) {
		const userId = this.sessionUserIds.get(connectionId);
		if (!userId) {
			return;
		}

		const userSessions = this.userSessions.get(userId);
		if (userSessions) {
			userSessions.delete(connectionId);
			if (userSessions.size === 0) {
				this.userSessions.delete(userId);
			}
		}

		this.sessionUserIds.delete(connectionId);
	}

	bindSessionToUser(connectionId: string, userId: string | null | undefined): void {
		const normalizedUserId = userId?.trim();
		const currentUserId = this.sessionUserIds.get(connectionId);
		if (currentUserId === normalizedUserId) {
			return;
		}

		this.removeUserSession(connectionId);
		if (normalizedUserId) {
			this.addUserSession(normalizedUserId, connectionId);
		}
	}

	getSession(connectionId: string): T | undefined {
		return this.sessions.get(connectionId);
	}

	getSessionsByUserId(userId: string): T[] {
		const connectionIds = this.userSessions.get(userId);
		if (!connectionIds) return [];

		const connections: T[] = [];
		for (const id of Array.from(connectionIds)) {
			const conn = this.sessions.get(id);
			if (conn) {
				connections.push(conn);
				continue;
			}

			connectionIds.delete(id);
			this.sessionUserIds.delete(id);
		}

		if (connectionIds.size === 0) {
			this.userSessions.delete(userId);
		}

		return connections;
	}

	removeSession(connectionId: string) {
		const connection = this.sessions.get(connectionId);
		this.removeUserSession(connectionId);
		if (connection) {
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

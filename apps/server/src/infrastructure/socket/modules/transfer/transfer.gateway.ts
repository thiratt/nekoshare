import { tcpSessionManager } from "@/infrastructure/socket/transport/tcp/connection";
import { wsSessionManager } from "@/infrastructure/socket/transport/ws/connection";

import type { IConnection } from "@/infrastructure/socket/runtime/types";

export function findConnectionBySessionId(sessionId: string | null): IConnection | undefined {
	if (!sessionId) {
		return undefined;
	}

	for (const session of wsSessionManager.getAllSessions()) {
		if (session.session?.id === sessionId) {
			return session;
		}
	}

	for (const session of tcpSessionManager.getAllSessions()) {
		if (session.session?.id === sessionId) {
			return session;
		}
	}

	return undefined;
}

import { createAuthClient } from "better-auth/react";

export const authClient: ReturnType<typeof createAuthClient> = createAuthClient({
	baseURL: "http://localhost:7780",
	basePath: "/auth",
});

type SessionData = Awaited<ReturnType<typeof authClient.getSession>>["data"];

interface SessionCache {
	session: SessionData;
	timestamp: number;
}

let sessionCache: SessionCache | null = null;
const SESSION_CACHE_TTL = 30_000;

export async function getCachedSession(): Promise<{
	session: SessionData;
	isAuthenticated: boolean;
}> {
	const now = Date.now();

	if (sessionCache && now - sessionCache.timestamp < SESSION_CACHE_TTL) {
		return {
			session: sessionCache.session,
			isAuthenticated: !!sessionCache.session?.user,
		};
	}

	const { data: session, error } = await authClient.getSession();

	if (!error) {
		sessionCache = { session, timestamp: now };
	}

	return {
		session: error ? null : session,
		isAuthenticated: !!session?.user && !error,
	};
}

export function invalidateSessionCache(): void {
	sessionCache = null;
}
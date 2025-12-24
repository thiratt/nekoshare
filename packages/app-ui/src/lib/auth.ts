import { usernameClient } from "better-auth/client/plugins";
import { oneTimeTokenClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
	baseURL: "http://localhost:7780",
	basePath: "/auth",
	plugins: [usernameClient(), oneTimeTokenClient()],
});

export type SessionData = typeof authClient.$Infer.Session;

let sessionPromise: Promise<SessionData | null> | null = null;
let lastFetchTime = 0;
const SESSION_CACHE_TTL = 30_000;

export async function getCachedSession() {
	if (typeof window === "undefined") {
		const { data } = await authClient.getSession();
		return { session: data, isAuthenticated: !!data?.user };
	}

	const now = Date.now();

	if (sessionPromise && now - lastFetchTime < SESSION_CACHE_TTL) {
		const session = await sessionPromise;
		return {
			session,
			isAuthenticated: !!session?.user,
		};
	}

	sessionPromise = authClient.getSession().then(({ data, error }) => {
		if (error) return null;
		return data;
	});

	lastFetchTime = now;

	const session = await sessionPromise;

	return {
		session,
		isAuthenticated: !!session?.user,
	};
}

export function invalidateSessionCache() {
	sessionPromise = null;
	lastFetchTime = 0;
}

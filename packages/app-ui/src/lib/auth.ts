import { usernameClient } from "better-auth/client/plugins";
import { oneTimeTokenClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import { config } from "./config";
import { AppError, createInternalError, ErrorCategory, ErrorSource, failure, type Result, success } from "./errors";

export const authClient = createAuthClient({
	baseURL: config.apiBaseUrl,
	basePath: "/auth",
	plugins: [usernameClient(), oneTimeTokenClient()],
});

export type SessionData = typeof authClient.$Infer.Session;

export interface SessionResult {
	session: SessionData | null;
	isAuthenticated: boolean;
}

export interface AuthenticationStatus {
	isAuthenticated: boolean;
	userId: string | null;
	username: string | null;
	email: string | null;
	sessionExpiresAt: Date | null;
}

interface SessionCache {
	promise: Promise<SessionData | null> | null;
	lastFetchTime: number;
}

const SESSION_CACHE_TTL_MS = 30_000;

const sessionCache: SessionCache = {
	promise: null,
	lastFetchTime: 0,
};

function isCacheValid(): boolean {
	const now = Date.now();
	return sessionCache.promise !== null && now - sessionCache.lastFetchTime < SESSION_CACHE_TTL_MS;
}

export async function getCachedSession(): Promise<Result<SessionResult>> {
	try {
		if (typeof window === "undefined") {
			const { data, error } = await authClient.getSession();

			if (error) {
				return failure(
					new AppError(
						`Authentication service returned an error: ${error.message || "Unknown error"}`,
						ErrorSource.EXTERNAL_API,
						ErrorCategory.AUTH,
						{ operation: "Server-side session fetch" },
					),
				);
			}

			return success({
				session: data,
				isAuthenticated: !!data?.user,
			});
		}

		if (isCacheValid()) {
			const session = await sessionCache.promise;
			return success({
				session,
				isAuthenticated: !!session?.user,
			});
		}

		sessionCache.promise = authClient
			.getSession()
			.then(({ data, error }) => {
				if (error) {
					console.warn("Session fetch warning:", error.message);
					return null;
				}
				return data;
			})
			.catch((error: unknown) => {
				console.error("Session fetch error:", error);
				return null;
			});

		sessionCache.lastFetchTime = Date.now();

		const session = await sessionCache.promise;

		return success({
			session,
			isAuthenticated: !!session?.user,
		});
	} catch (error) {
		return failure(
			createInternalError(
				error instanceof Error ? error.message : "Unknown error during session fetch",
				"Session Cache Management",
				error,
			),
		);
	}
}

export async function getAuthenticationStatus(): Promise<Result<AuthenticationStatus>> {
	const sessionResult = await getCachedSession();

	if (sessionResult.status === "error") {
		return sessionResult;
	}

	const { session, isAuthenticated } = sessionResult.data;

	return success({
		isAuthenticated,
		userId: session?.user?.id ?? null,
		username: session?.user?.name ?? null,
		email: session?.user?.email ?? null,
		sessionExpiresAt: session?.session?.expiresAt ? new Date(session.session.expiresAt) : null,
	});
}

export function invalidateSessionCache(): void {
	sessionCache.promise = null;
	sessionCache.lastFetchTime = 0;
}

export async function isAuthenticated(): Promise<boolean> {
	const result = await getCachedSession();
	return result.status === "success" && result.data.isAuthenticated;
}

export async function getSession(): Promise<SessionData | null> {
	const result = await getCachedSession();
	if (result.status === "error") {
		return null;
	}
	return result.data.session;
}

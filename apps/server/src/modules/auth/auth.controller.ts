import { generateRandomString } from "better-auth/crypto";
import { handleOAuthUserInfo } from "better-auth/oauth2";

import { Logger } from "@/infrastructure/logger";
import { auth } from "@/modules/auth/lib";
import type { AppContext } from "@/shared/http/router";

const DESKTOP_GOOGLE_VERIFICATION_PREFIX = "desktop-google-oauth:";
const GOOGLE_CALLBACK_PATH = "/auth/callback/google";
const DESKTOP_GOOGLE_STATE_TTL_MS = 10 * 60 * 1000;

type DesktopAuthFlow = "login" | "signup";

interface DesktopGoogleStatePayload {
	attempt?: string;
	callbackUrl?: string;
	codeVerifier: string;
	flow: DesktopAuthFlow;
}

function getDesktopAuthFlow(c: AppContext): DesktopAuthFlow {
	return c.req.query("flow") === "signup" ? "signup" : "login";
}

function normalizeDesktopAuthError(error: unknown): string {
	if (typeof error === "string" && error.trim().length > 0) {
		return error.trim();
	}

	if (error && typeof error === "object") {
		const candidate = error as {
			code?: string;
			error?: string;
			message?: string;
			body?: { code?: string; error?: string; message?: string };
		};

		if (typeof candidate.code === "string" && candidate.code.trim().length > 0) {
			return candidate.code.trim();
		}
		if (typeof candidate.error === "string" && candidate.error.trim().length > 0) {
			return candidate.error.trim();
		}

		if (typeof candidate.body?.code === "string" && candidate.body.code.trim().length > 0) {
			return candidate.body.code.trim();
		}
		if (typeof candidate.body?.error === "string" && candidate.body.error.trim().length > 0) {
			return candidate.body.error.trim();
		}
		if (typeof candidate.body?.message === "string" && candidate.body.message.trim().length > 0) {
			return candidate.body.message.trim().replace(/\s+/g, "_").toLowerCase();
		}

		if (typeof candidate.message === "string" && candidate.message.trim().length > 0) {
			return candidate.message.trim().replace(/\s+/g, "_").toLowerCase();
		}
	}

	return "oauth_failed";
}

function normalizeDesktopCallbackUrl(input?: string): string | undefined {
	if (!input) {
		return undefined;
	}

	try {
		const callbackUrl = new URL(input);
		if (callbackUrl.protocol !== "http:") {
			return undefined;
		}

		const hostname = callbackUrl.hostname.toLowerCase();
		if (hostname !== "127.0.0.1" && hostname !== "localhost" && hostname !== "::1") {
			return undefined;
		}

		if (!callbackUrl.port) {
			return undefined;
		}

		return callbackUrl.toString();
	} catch {
		return undefined;
	}
}

function createDesktopLoopbackRedirect(
	callbackUrl: string,
	params: {
		flow: DesktopAuthFlow;
		attempt?: string;
		token?: string;
		error?: string;
	},
) {
	const redirectUrl = new URL(callbackUrl);
	redirectUrl.searchParams.set("flow", params.flow);

	if (params.attempt) {
		redirectUrl.searchParams.set("attempt", params.attempt);
	}

	if (params.token) {
		redirectUrl.searchParams.set("token", params.token);
	} else {
		redirectUrl.searchParams.delete("token");
	}

	if (params.error) {
		redirectUrl.searchParams.set("error", params.error);
	} else {
		redirectUrl.searchParams.delete("error");
	}

	return redirectUrl.toString();
}

function respondWithDesktopAuthRedirect(
	c: AppContext,
	params: {
		callbackUrl?: string;
		flow: DesktopAuthFlow;
		attempt?: string;
		token?: string;
		error?: string;
	},
) {
	if (!params.callbackUrl) {
		return c.json(
			{
				error: "desktop_callback_missing",
				message: "Desktop auth callback URL is missing or invalid.",
			},
			400,
		);
	}

	return c.redirect(createDesktopLoopbackRedirect(params.callbackUrl, params));
}

function getDesktopGoogleStateKey(state: string): string {
	return `${DESKTOP_GOOGLE_VERIFICATION_PREFIX}${state}`;
}

function getGoogleCallbackUrl(c: AppContext, baseUrl?: string): string {
	if (baseUrl) {
		return new URL(GOOGLE_CALLBACK_PATH, baseUrl).toString();
	}

	const forwardedProto = c.req.header("x-forwarded-proto");
	const forwardedHost = c.req.header("x-forwarded-host");
	if (forwardedProto && forwardedHost) {
		return `${forwardedProto}://${forwardedHost}${GOOGLE_CALLBACK_PATH}`;
	}

	return new URL(GOOGLE_CALLBACK_PATH, c.req.url).toString();
}

export const authController = {
	handle(c: AppContext) {
		return auth.handler(c.req.raw);
	},
	async handleDesktopGoogleStart(c: AppContext) {
		const flow = getDesktopAuthFlow(c);
		const attempt = c.req.query("attempt") ?? undefined;
		const callbackUrl = normalizeDesktopCallbackUrl(c.req.query("callback_url") ?? undefined);
		if (!callbackUrl) {
			return respondWithDesktopAuthRedirect(c, {
				callbackUrl,
				flow,
				attempt,
				error: "desktop_callback_missing",
			});
		}

		try {
			const authContext = await auth.$context;
			const provider = authContext.socialProviders.find((entry) => entry.id === "google");
			if (!provider) {
				throw new Error("oauth_failed");
			}

			const state = generateRandomString(32);
			const codeVerifier = generateRandomString(128);
			const redirectURI = getGoogleCallbackUrl(c, authContext.baseURL);
			const authorizationUrl = await provider.createAuthorizationURL({
				state,
				codeVerifier,
				redirectURI,
			});

			await authContext.internalAdapter.createVerificationValue({
				identifier: getDesktopGoogleStateKey(state),
				value: JSON.stringify({
					attempt,
					callbackUrl,
					codeVerifier,
					flow,
				} satisfies DesktopGoogleStatePayload),
				expiresAt: new Date(Date.now() + DESKTOP_GOOGLE_STATE_TTL_MS),
			});

			return c.redirect(authorizationUrl.toString());
		} catch (error) {
			Logger.warn("Auth", "Failed to start desktop Google OAuth flow", error);

			return respondWithDesktopAuthRedirect(c, {
				callbackUrl,
				flow,
				attempt,
				error: normalizeDesktopAuthError(error),
			});
		}
	},
	async handleGoogleCallback(c: AppContext) {
		const state = c.req.query("state");
		if (!state) {
			return auth.handler(c.req.raw);
		}

		const authContext = await auth.$context;
		const stateKey = getDesktopGoogleStateKey(state);
		const storedState = await authContext.internalAdapter.findVerificationValue(stateKey);
		if (!storedState) {
			return auth.handler(c.req.raw);
		}

		await authContext.internalAdapter.deleteVerificationByIdentifier(stateKey);

		let flow: DesktopAuthFlow = "login";
		let attempt: string | undefined;
		let callbackUrl: string | undefined;
		let codeVerifier = "";

		try {
			const payload = JSON.parse(storedState.value) as Partial<DesktopGoogleStatePayload>;
			flow = payload.flow === "signup" ? "signup" : "login";
			attempt = typeof payload.attempt === "string" ? payload.attempt : undefined;
			callbackUrl = normalizeDesktopCallbackUrl(
				typeof payload.callbackUrl === "string" ? payload.callbackUrl : undefined,
			);
			codeVerifier = typeof payload.codeVerifier === "string" ? payload.codeVerifier : "";
		} catch (error) {
			Logger.warn("Auth", "Failed to parse stored desktop Google state", error);
		}

		if (!codeVerifier || storedState.expiresAt < new Date()) {
			return respondWithDesktopAuthRedirect(c, {
				callbackUrl,
				flow,
				attempt,
				error: "state_mismatch",
			});
		}

		const callbackError = c.req.query("error");

		if (callbackError) {
			return respondWithDesktopAuthRedirect(c, {
				callbackUrl,
				flow,
				attempt,
				error: callbackError,
			});
		}

		try {
			const provider = authContext.socialProviders.find((entry) => entry.id === "google");
			const code = c.req.query("code");
			if (!provider || !code) {
				throw new Error("oauth_failed");
			}

			const redirectURI = getGoogleCallbackUrl(c, authContext.baseURL);
			const tokens = await provider.validateAuthorizationCode({
				code,
				codeVerifier,
				redirectURI,
			});
			if (!tokens?.idToken) {
				throw new Error("unable_to_get_user_info");
			}

			const userInfo = await provider.getUserInfo(tokens);
			if (!userInfo?.user?.email) {
				throw new Error("unable_to_get_user_info");
			}

			const oauthResult = await handleOAuthUserInfo(
				{
					context: authContext,
					redirect: (url: string) => c.redirect(url),
					request: c.req.raw,
				} as never,
				{
					userInfo: {
						...userInfo.user,
						email: userInfo.user.email,
						emailVerified: userInfo.user.emailVerified || false,
						id: String(userInfo.user.id),
						image: userInfo.user.image,
						name: userInfo.user.name || "",
					},
					account: {
						providerId: provider.id,
						accountId: String(userInfo.user.id),
						accessToken: tokens.accessToken,
						refreshToken: tokens.refreshToken,
						idToken: tokens.idToken,
						accessTokenExpiresAt: tokens.accessTokenExpiresAt,
						refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
						scope: tokens.scopes?.join(" "),
					},
					callbackURL: "/",
					disableSignUp: (provider.disableImplicitSignUp && flow !== "signup") || !!provider.disableSignUp,
				} as never,
			);

			if (oauthResult.error || !oauthResult.data?.session.token) {
				throw new Error(oauthResult.error ?? "session_not_found");
			}

			const result = await auth.api.generateOneTimeToken({
				headers: new Headers({
					authorization: `Bearer ${oauthResult.data.session.token}`,
				}),
			});

			return respondWithDesktopAuthRedirect(c, {
				callbackUrl,
				flow,
				attempt,
				token: result.token,
			});
		} catch (error) {
			Logger.warn("Auth", "Failed to complete desktop Google OAuth callback", error);

			return respondWithDesktopAuthRedirect(c, {
				callbackUrl,
				flow,
				attempt,
				error: normalizeDesktopAuthError(error),
			});
		}
	},
};

import { generateRandomString } from "better-auth/crypto";
import { z } from "zod";

import {
	getPublicBaseURL,
	type ProviderAccountPayload,
	resolveAuthenticatedGoogleLink,
	resolveGoogleContinue,
} from "./lib/app-auth";

import { env } from "@/config/env";
import { Logger } from "@/infrastructure/logger";
import { auth } from "@/modules/auth/lib";
import { handleControllerError, HttpServiceError, jsonSuccess } from "@/shared/http";
import type { AppContext } from "@/shared/http/router";
import { error } from "@/types";
import type { AppLanguage } from "@workspace/i18n/core";
import { getServerT, resolveRequestLanguage } from "@workspace/i18n/server";

const DESKTOP_GOOGLE_STATE_PREFIX = "desktop-google-oauth:";
const DESKTOP_GOOGLE_STATE_TTL_MS = 10 * 60 * 1000;
const GOOGLE_APP_CALLBACK_PATH = "/auth/app/provider/google/callback";
const GOOGLE_TOKEN_INFO_URL = "https://oauth2.googleapis.com/tokeninfo";

type DesktopAuthFlow = "login" | "signup";

interface DesktopGoogleStatePayload {
	attempt?: string;
	callbackUrl?: string;
	codeVerifier: string;
	flow: DesktopAuthFlow;
	language?: AppLanguage;
}

interface GoogleIdentityProfile {
	email: string;
	emailVerified: boolean;
	id: string;
	image?: string;
	name: string;
}

const appGoogleContinueBodySchema = z.object({
	callbackURL: z.string().url().optional(),
	idToken: z.string().min(1),
	language: z.enum(["th", "en"]).optional(),
});

const appGoogleLinkBodySchema = z.object({
	idToken: z.string().min(1),
	language: z.enum(["th", "en"]).optional(),
});

const googleTokenInfoSchema = z.object({
	aud: z.string(),
	email: z.string().email(),
	email_verified: z.union([z.literal("true"), z.literal("false"), z.boolean()]),
	exp: z.string(),
	iss: z.string(),
	name: z.string().optional(),
	picture: z.string().optional(),
	sub: z.string().min(1),
});

function createDesktopLoopbackRedirect(
	callbackUrl: string,
	params: {
		attempt?: string;
		error?: string;
		flow: DesktopAuthFlow;
		token?: string;
	},
) {
	const redirectUrl = new URL(callbackUrl);
	redirectUrl.searchParams.set("flow", params.flow);

	if (params.attempt) {
		redirectUrl.searchParams.set("attempt", params.attempt);
	} else {
		redirectUrl.searchParams.delete("attempt");
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

function getDesktopAuthFlow(c: AppContext): DesktopAuthFlow {
	return c.req.query("flow") === "signup" ? "signup" : "login";
}

function getDesktopGoogleStateKey(state: string): string {
	return `${DESKTOP_GOOGLE_STATE_PREFIX}${state}`;
}

function getDesktopGoogleStartCallbackUrl(c: AppContext, baseUrl?: string): string {
	if (baseUrl) {
		return new URL(GOOGLE_APP_CALLBACK_PATH, baseUrl).toString();
	}

	const forwardedProto = c.req.header("x-forwarded-proto");
	const forwardedHost = c.req.header("x-forwarded-host");
	if (forwardedProto && forwardedHost) {
		return `${forwardedProto}://${forwardedHost}${GOOGLE_APP_CALLBACK_PATH}`;
	}

	return new URL(GOOGLE_APP_CALLBACK_PATH, c.req.url).toString();
}

function getPublicBaseUrlFromContext(): string {
	return getPublicBaseURL();
}

async function getContextLanguage(
	c: AppContext,
	explicitLanguage?: string | null,
	options?: { includeSession?: boolean },
) {
	let sessionLanguage: string | null | undefined;

	if (options?.includeSession) {
		const session = await auth.api.getSession({ headers: c.req.raw.headers }).catch(() => null);
		sessionLanguage = (session?.user as { language?: string | null } | undefined)?.language;
	}

	return resolveRequestLanguage({
		explicitLanguage,
		headers: c.req.raw.headers,
		sessionLanguage,
	});
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

function respondWithDesktopAuthRedirect(
	c: AppContext,
	params: {
		attempt?: string;
		callbackUrl?: string;
		error?: string;
		flow: DesktopAuthFlow;
		token?: string;
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

function toProviderAccount(
	profile: GoogleIdentityProfile,
	params: Partial<ProviderAccountPayload> = {},
): ProviderAccountPayload {
	return {
		accountId: profile.id,
		email: profile.email,
		emailVerified: profile.emailVerified,
		idToken: params.idToken,
		image: profile.image,
		name: profile.name,
		providerId: "google",
		...params,
	};
}

function terminalFlowFromHttpError(error: HttpServiceError, message: string) {
	switch (error.code) {
		case "email_not_verified":
			return {
				code: "email_not_verified",
				message,
				status: "terminal_error",
			} as const;
		case "invalid_token":
			return {
				code: "invalid_token",
				message,
				status: "terminal_error",
			} as const;
		case "token_expired":
			return {
				code: "token_expired",
				message,
				status: "terminal_error",
			} as const;
		default:
			return {
				code: "oauth_failed",
				message,
				status: "terminal_error",
			} as const;
	}
}

async function verifyGoogleIdToken(idToken: string): Promise<GoogleIdentityProfile> {
	const tokenInfoUrl = new URL(GOOGLE_TOKEN_INFO_URL);
	tokenInfoUrl.searchParams.set("id_token", idToken);

	const response = await fetch(tokenInfoUrl.toString(), {
		headers: {
			accept: "application/json",
		},
	});

	if (!response.ok) {
		throw new HttpServiceError("invalid_token", 401, "Invalid Google ID token.");
	}

	const parsed = googleTokenInfoSchema.safeParse(await response.json());
	if (!parsed.success) {
		throw new HttpServiceError("invalid_token", 401, "Invalid Google ID token payload.");
	}

	const payload = parsed.data;
	const isEmailVerified = payload.email_verified === true || payload.email_verified === "true";
	const normalizedIssuer = payload.iss.trim().toLowerCase();
	const expiresAtMs = Number(payload.exp) * 1000;

	if (payload.aud !== env.GOOGLE_CLIENT_ID) {
		throw new HttpServiceError("invalid_token", 401, "Google ID token audience is invalid.");
	}

	if (normalizedIssuer !== "accounts.google.com" && normalizedIssuer !== "https://accounts.google.com") {
		throw new HttpServiceError("invalid_token", 401, "Google ID token issuer is invalid.");
	}

	if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
		throw new HttpServiceError("token_expired", 401, "Google ID token has expired.");
	}

	if (!isEmailVerified) {
		throw new HttpServiceError("email_not_verified", 401, "Google account email is not verified.");
	}

	return {
		email: payload.email.toLowerCase(),
		emailVerified: true,
		id: payload.sub,
		image: payload.picture,
		name: payload.name?.trim() || payload.email.split("@")[0] || "Google User",
	};
}

export async function handleAppGoogleContinue(c: AppContext) {
	try {
		const payload = appGoogleContinueBodySchema.parse(await c.req.json());
		const language = await getContextLanguage(c, payload.language);
		const profile = await verifyGoogleIdToken(payload.idToken);
		const result = await resolveGoogleContinue(toProviderAccount(profile, { idToken: payload.idToken }), {
			callbackURL: payload.callbackURL,
			language,
			publicBaseURL: getPublicBaseUrlFromContext(),
		});

		return jsonSuccess(c, result);
	} catch (error) {
		if (error instanceof HttpServiceError) {
			const language = await getContextLanguage(c);
			const t = await getServerT(language);
			return jsonSuccess(
				c,
				terminalFlowFromHttpError(
					error,
					error.code === "email_not_verified"
						? t("errors.auth.codes.email_not_verified")
						: error.code === "token_expired"
							? t("errors.auth.codes.token_expired")
							: error.code === "invalid_token"
								? t("errors.auth.codes.invalid_token")
								: t("errors.auth.codes.oauth_failed"),
				),
			);
		}

		if (error instanceof z.ZodError) {
			return handleControllerError(c, error, { withValidation: true });
		}

		Logger.warn("Auth", "Failed to resolve app Google continue flow", error);
		const language = await getContextLanguage(c);
		const t = await getServerT(language);
		return jsonSuccess(c, {
			code: "oauth_failed",
			message: t("errors.auth.codes.oauth_failed"),
			status: "terminal_error",
		});
	}
}

export async function handleAppGoogleLink(c: AppContext) {
	try {
		const session = await auth.api.getSession({ headers: c.req.raw.headers });
		if (!session?.user) {
			return c.json(error("UNAUTHORIZED", "Please login to continue"), 401);
		}

		const payload = appGoogleLinkBodySchema.parse(await c.req.json());
		const language = await getContextLanguage(c, payload.language, { includeSession: true });
		const profile = await verifyGoogleIdToken(payload.idToken);
		const result = await resolveAuthenticatedGoogleLink(
			session.user.id,
			toProviderAccount(profile, { idToken: payload.idToken }),
			language,
		);

		return jsonSuccess(c, result);
	} catch (error) {
		if (error instanceof HttpServiceError) {
			const language = await getContextLanguage(c, undefined, { includeSession: true });
			const t = await getServerT(language);
			return jsonSuccess(
				c,
				terminalFlowFromHttpError(
					error,
					error.code === "email_not_verified"
						? t("errors.auth.codes.email_not_verified")
						: error.code === "token_expired"
							? t("errors.auth.codes.token_expired")
							: error.code === "invalid_token"
								? t("errors.auth.codes.invalid_token")
								: t("errors.auth.codes.oauth_failed"),
				),
			);
		}

		if (error instanceof z.ZodError) {
			return handleControllerError(c, error, { withValidation: true });
		}

		Logger.warn("Auth", "Failed to resolve authenticated Google link", error);
		const language = await getContextLanguage(c, undefined, { includeSession: true });
		const t = await getServerT(language);
		return jsonSuccess(c, {
			code: "oauth_failed",
			message: t("errors.auth.codes.unable_to_link_account"),
			status: "terminal_error",
		});
	}
}

export async function handleDesktopGoogleStart(c: AppContext) {
	const flow = getDesktopAuthFlow(c);
	const attempt = c.req.query("attempt") ?? undefined;
	const callbackUrl = c.req.query("callback_url") ?? undefined;
	const language = await getContextLanguage(c, c.req.query("lng"));

	try {
		if (!callbackUrl) {
			throw new Error("desktop_callback_missing");
		}

		const normalizedCallbackURL = new URL(callbackUrl);
		if (normalizedCallbackURL.protocol !== "http:" || !normalizedCallbackURL.port) {
			throw new Error("desktop_callback_missing");
		}

		const hostname = normalizedCallbackURL.hostname.toLowerCase();
		if (!["127.0.0.1", "localhost", "::1"].includes(hostname)) {
			throw new Error("desktop_callback_missing");
		}

		const authContext = await auth.$context;
		const provider = authContext.socialProviders.find((entry) => entry.id === "google");
		if (!provider) {
			throw new Error("oauth_failed");
		}

		const state = generateRandomString(32);
		const codeVerifier = generateRandomString(128);
		const redirectURI = getDesktopGoogleStartCallbackUrl(c, authContext.baseURL);
		const authorizationUrl = await provider.createAuthorizationURL({
			codeVerifier,
			redirectURI,
			state,
		});

		await authContext.internalAdapter.createVerificationValue({
			expiresAt: new Date(Date.now() + DESKTOP_GOOGLE_STATE_TTL_MS),
			identifier: getDesktopGoogleStateKey(state),
			value: JSON.stringify({
				attempt,
				callbackUrl: normalizedCallbackURL.toString(),
				codeVerifier,
				flow,
				language,
			} satisfies DesktopGoogleStatePayload),
		});

		return c.redirect(authorizationUrl.toString());
	} catch (error) {
		Logger.warn("Auth", "Failed to start desktop Google OAuth flow", error);

		return respondWithDesktopAuthRedirect(c, {
			attempt,
			callbackUrl,
			error: normalizeDesktopAuthError(error),
			flow,
		});
	}
}

export async function handleGoogleCallback(c: AppContext) {
	const state = c.req.query("state");
	if (!state) {
		return auth.handler(c.req.raw);
	}

	const authContext = await auth.$context;
	const storedState = await authContext.internalAdapter.findVerificationValue(getDesktopGoogleStateKey(state));
	if (!storedState) {
		return auth.handler(c.req.raw);
	}

	await authContext.internalAdapter.deleteVerificationByIdentifier(getDesktopGoogleStateKey(state));

	let attempt: string | undefined;
	let callbackUrl: string | undefined;
	let codeVerifier = "";
	let flow: DesktopAuthFlow = "login";
	let language: AppLanguage | undefined;

	try {
		const payload = JSON.parse(storedState.value) as Partial<DesktopGoogleStatePayload>;
		attempt = typeof payload.attempt === "string" ? payload.attempt : undefined;
		callbackUrl = typeof payload.callbackUrl === "string" ? payload.callbackUrl : undefined;
		codeVerifier = typeof payload.codeVerifier === "string" ? payload.codeVerifier : "";
		flow = payload.flow === "signup" ? "signup" : "login";
		language = payload.language;
	} catch (error) {
		Logger.warn("Auth", "Failed to parse stored desktop Google state", error);
	}

	if (!callbackUrl || !codeVerifier || storedState.expiresAt < new Date()) {
		return respondWithDesktopAuthRedirect(c, {
			attempt,
			callbackUrl,
			error: "state_mismatch",
			flow,
		});
	}

	const providerError = c.req.query("error");
	if (providerError) {
		return respondWithDesktopAuthRedirect(c, {
			attempt,
			callbackUrl,
			error: providerError,
			flow,
		});
	}

	try {
		const provider = authContext.socialProviders.find((entry) => entry.id === "google");
		const code = c.req.query("code");
		if (!provider || !code) {
			throw new Error("oauth_failed");
		}

		const redirectURI = getDesktopGoogleStartCallbackUrl(c, authContext.baseURL);
		const tokens = await provider.validateAuthorizationCode({
			code,
			codeVerifier,
			redirectURI,
		});
		if (!tokens?.idToken) {
			throw new Error("invalid_token");
		}

		const userInfo = await provider.getUserInfo(tokens);
		if (!userInfo?.user?.email) {
			throw new Error("email_not_found");
		}

		const result = await resolveGoogleContinue(
			toProviderAccount(
				{
					email: userInfo.user.email.toLowerCase(),
					emailVerified: Boolean(userInfo.user.emailVerified),
					id: String(userInfo.user.id),
					image: userInfo.user.image,
					name: userInfo.user.name || userInfo.user.email.split("@")[0] || "Google User",
				},
				{
					accessToken: tokens.accessToken,
					accessTokenExpiresAt: tokens.accessTokenExpiresAt,
					idToken: tokens.idToken,
					refreshToken: tokens.refreshToken,
					refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
					scope: tokens.scopes?.join(" "),
				},
			),
			{
				language,
				publicBaseURL: getPublicBaseUrlFromContext(),
			},
		);

		if (result.status === "signed_in") {
			return respondWithDesktopAuthRedirect(c, {
				attempt,
				callbackUrl,
				flow,
				token: result.resultToken.token,
			});
		}

		const errorCode = result.status === "action_required" ? result.code : result.code;
		return respondWithDesktopAuthRedirect(c, {
			attempt,
			callbackUrl,
			error: errorCode,
			flow,
		});
	} catch (error) {
		Logger.warn("Auth", "Failed to complete desktop Google OAuth callback", error);

		return respondWithDesktopAuthRedirect(c, {
			attempt,
			callbackUrl,
			error: normalizeDesktopAuthError(error),
			flow,
		});
	}
}

export async function handleMobileGoogleAuth(c: AppContext) {
	return await handleAppGoogleContinue(c);
}

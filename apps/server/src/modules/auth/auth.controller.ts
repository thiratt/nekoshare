import { generateRandomString } from "better-auth/crypto";
import { z } from "zod";

import {
	buildCallbackRedirectURL,
	completePasswordSetup,
	consumeAuthChallenge,
	getPasswordSetupPageHtml,
	getPublicBaseURL,
	getStatusPageHtml,
	type ProviderAccountPayload,
	resolveAuthenticatedGoogleLink,
	resolveEmailSignIn,
	resolveEmailSignUp,
	resolveGoogleContinue,
	resolvePasswordHelp,
} from "./lib/app-auth";
import {
	createSignedUserProfileAvatarReadUrl,
	deleteUserProfileAvatar,
	isUserProfileAvatarContentType,
	isUserProfileAvatarStorageConfigured,
	uploadUserProfileAvatar,
	USER_PROFILE_AVATAR_MAX_BYTES,
} from "./lib/user-profile-avatar-storage";

import { env } from "@/config/env";
import { Logger } from "@/infrastructure/logger";
import { auth } from "@/modules/auth/lib";
import { HttpServiceError } from "@/shared/http";
import { handleControllerError, jsonSuccess } from "@/shared/http";
import type { AppContext } from "@/shared/http/router";
import { error, success } from "@/types";

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
}

interface GoogleIdentityProfile {
	email: string;
	emailVerified: boolean;
	id: string;
	image?: string;
	name: string;
}

const appEmailSignInBodySchema = z.object({
	callbackURL: z.string().url().optional(),
	email: z.string().email(),
	password: z.string().min(1),
});

const appEmailSignUpBodySchema = z.object({
	callbackURL: z.string().url().optional(),
	email: z.string().email(),
	name: z.string().trim().min(1),
	password: z.string().min(1),
	username: z.string().trim().min(1).optional(),
});

const appPasswordHelpBodySchema = z.object({
	callbackURL: z.string().url().optional(),
	email: z.string().email(),
});

const appResultExchangeBodySchema = z.object({
	token: z.string().min(1),
});

const appGoogleContinueBodySchema = z.object({
	callbackURL: z.string().url().optional(),
	idToken: z.string().min(1),
});

const appGoogleLinkBodySchema = z.object({
	idToken: z.string().min(1),
});

const passwordSetupBodySchema = z.object({
	newPassword: z.string().min(1),
	token: z.string().min(1),
});

const accountSetPasswordBodySchema = z.object({
	newPassword: z.string().min(1),
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

function jsonWithHeaders(body: unknown, status: number, headers: Headers) {
	const responseHeaders = new Headers(headers);
	responseHeaders.set("content-type", "application/json; charset=utf-8");

	return new Response(JSON.stringify(body), {
		headers: responseHeaders,
		status,
	});
}

function copySetCookieHeaders(source: Headers, target: Headers): void {
	const headersWithGetSetCookie = source as Headers & { getSetCookie?: () => string[] };
	const setCookieValues = headersWithGetSetCookie.getSetCookie?.() ?? [];

	if (setCookieValues.length > 0) {
		for (const value of setCookieValues) {
			target.append("set-cookie", value);
		}
		return;
	}

	const setCookie = source.get("set-cookie");
	if (setCookie) {
		target.append("set-cookie", setCookie);
	}
}

function getAccountStatusErrorContent(kind: string, errorCode?: string) {
	const normalizedKind = kind.trim().toLowerCase();
	const normalizedCode = errorCode?.trim().toLowerCase();

	if (normalizedKind === "email-change") {
		if (!normalizedCode) {
			return {
				message: "Your new email has been verified. You can close this page and return to Nekoshare.",
				status: 200,
				title: "Email updated",
			};
		}

		switch (normalizedCode) {
			case "invalid_token":
				return {
					message: "This verification link is invalid.",
					status: 400,
					title: "Unable to verify email",
				};
			case "token_expired":
				return {
					message:
						"This verification link has expired. Please request a new email change from account settings.",
					status: 400,
					title: "Verification link expired",
				};
			case "invalid_user":
				return {
					message: "This verification link belongs to a different signed-in user.",
					status: 400,
					title: "Unable to verify email",
				};
			case "user_not_found":
				return {
					message: "The account for this verification link could not be found.",
					status: 404,
					title: "Account not found",
				};
			default:
				return {
					message: "We could not verify your new email. Please try again from account settings.",
					status: 400,
					title: "Unable to verify email",
				};
		}
	}

	if (!normalizedCode) {
		return {
			message: "The request finished successfully. You can close this page and return to Nekoshare.",
			status: 200,
			title: "Done",
		};
	}

	return {
		message: "This request could not be completed.",
		status: 400,
		title: "Unable to continue",
	};
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

function terminalFlowFromHttpError(error: HttpServiceError) {
	switch (error.code) {
		case "email_not_verified":
			return {
				code: "email_not_verified",
				message: error.message,
				status: "terminal_error",
			} as const;
		case "invalid_token":
			return {
				code: "invalid_token",
				message: error.message,
				status: "terminal_error",
			} as const;
		case "token_expired":
			return {
				code: "token_expired",
				message: error.message,
				status: "terminal_error",
			} as const;
		default:
			return {
				code: "oauth_failed",
				message: error.message,
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

async function readPasswordSetupSubmission(c: AppContext) {
	const contentType = c.req.header("content-type") || "";
	if (contentType.includes("application/json")) {
		return {
			isJson: true,
			payload: passwordSetupBodySchema.parse(await c.req.json()),
		};
	}

	const formData = await c.req.raw.formData();
	return {
		isJson: false,
		payload: passwordSetupBodySchema.parse({
			newPassword: formData.get("newPassword"),
			token: formData.get("token"),
		}),
	};
}

export const authController = {
	handle(c: AppContext) {
		return auth.handler(c.req.raw);
	},
	async handleAccountSetPassword(c: AppContext) {
		try {
			const payload = accountSetPasswordBodySchema.parse(await c.req.json());
			return await auth.api.setPassword({
				asResponse: true,
				body: payload,
				headers: c.req.raw.headers,
			});
		} catch (err) {
			if (err instanceof z.ZodError) {
				return handleControllerError(c, err, { withValidation: true });
			}

			Logger.warn("Auth", "Failed to complete account set-password request", err);
			return c.json(error("SET_PASSWORD_FAILED", "Unable to save password right now."), 500);
		}
	},
	handleAccountStatus(c: AppContext) {
		const kind = c.req.query("kind") ?? "default";
		const errorCode = c.req.query("error") ?? undefined;
		const statusContent = getAccountStatusErrorContent(kind, errorCode);

		return c.html(
			getStatusPageHtml(statusContent.title, statusContent.message),
			statusContent.status as 200 | 400 | 404,
		);
	},
	async handleAccountAvatarUpload(c: AppContext) {
		if (!isUserProfileAvatarStorageConfigured()) {
			return c.json(error("AVATAR_STORAGE_NOT_CONFIGURED", "Avatar storage is not configured."), 503);
		}

		const session = await auth.api.getSession({ headers: c.req.raw.headers });
		if (!session?.user) {
			return c.json(error("UNAUTHORIZED", "Please login to continue"), 401);
		}

		const contentType = c.req.header("content-type")?.split(";")[0]?.trim().toLowerCase();
		if (!isUserProfileAvatarContentType(contentType)) {
			return c.json(error("UNSUPPORTED_AVATAR_TYPE", "Avatar image must be WebP, PNG, or JPEG."), 415);
		}

		const contentLength = Number(c.req.header("content-length") ?? "0");
		if (Number.isFinite(contentLength) && contentLength > USER_PROFILE_AVATAR_MAX_BYTES) {
			return c.json(error("AVATAR_TOO_LARGE", "Avatar image must be 5 MB or smaller."), 413);
		}

		try {
			const body = Buffer.from(await c.req.arrayBuffer());
			if (body.byteLength === 0) {
				return c.json(error("AVATAR_EMPTY", "Avatar image is empty."), 400);
			}

			if (body.byteLength > USER_PROFILE_AVATAR_MAX_BYTES) {
				return c.json(error("AVATAR_TOO_LARGE", "Avatar image must be 5 MB or smaller."), 413);
			}

			const upload = await uploadUserProfileAvatar({
				body,
				contentType,
			});
			const updateResponse = await auth.api.updateUser({
				asResponse: true,
				body: { image: upload.imageUrl },
				headers: c.req.raw.headers,
			});

			if (!updateResponse.ok) {
				await deleteUserProfileAvatar(upload.objectKey).catch((deleteError) => {
					Logger.warn("Auth", "Failed to clean up uploaded avatar after user update failure", deleteError);
				});

				const failurePayload = await updateResponse.json().catch(() => null);
				const errorPayload =
					failurePayload && typeof failurePayload === "object" && !Array.isArray(failurePayload)
						? (failurePayload as { code?: string; error?: string; message?: string })
						: {};

				return c.json(
					error(
						errorPayload.code ?? errorPayload.error ?? "AVATAR_PROFILE_UPDATE_FAILED",
						errorPayload.message ?? "Unable to save avatar right now.",
					),
					updateResponse.status as 400 | 401 | 403 | 500,
				);
			}

			const headers = new Headers({ "content-type": "application/json; charset=utf-8" });
			copySetCookieHeaders(updateResponse.headers, headers);

			return new Response(JSON.stringify(upload), {
				headers,
				status: 200,
			});
		} catch (err) {
			Logger.warn("Auth", "Failed to upload account avatar", err);
			return c.json(error("AVATAR_UPLOAD_FAILED", "Unable to upload avatar right now."), 500);
		}
	},
	async handleAccountAvatarRead(c: AppContext) {
		if (!isUserProfileAvatarStorageConfigured()) {
			return c.json(error("AVATAR_STORAGE_NOT_CONFIGURED", "Avatar storage is not configured."), 503);
		}

		const objectKey = c.req.query("key");
		if (!objectKey) {
			return c.json(error("AVATAR_KEY_REQUIRED", "Avatar key is required."), 400);
		}

		try {
			return c.redirect(await createSignedUserProfileAvatarReadUrl(objectKey));
		} catch (err) {
			Logger.warn("Auth", "Failed to create signed avatar read URL", err);
			return c.json(error("AVATAR_READ_FAILED", "Unable to load avatar right now."), 500);
		}
	},
	async handleAppChallengeConsume(c: AppContext) {
		const token = c.req.query("token");
		if (!token) {
			return c.html(getStatusPageHtml("Invalid request", "A verification token is required."), 400);
		}

		const result = await consumeAuthChallenge(token);

		if (result.kind === "render_setup_password_form") {
			return c.html(getPasswordSetupPageHtml(result.email, token));
		}

		if (result.kind === "error") {
			if (result.callbackURL) {
				return c.redirect(
					buildCallbackRedirectURL(result.callbackURL, { error: "invalid_or_expired_challenge" }),
				);
			}

			return c.html(getStatusPageHtml(result.title, result.message), 400);
		}

		if (result.callbackURL && result.redirectToken) {
			return c.redirect(buildCallbackRedirectURL(result.callbackURL, { token: result.redirectToken }));
		}

		if (result.callbackURL && !result.redirectToken) {
			return c.redirect(buildCallbackRedirectURL(result.callbackURL, { error: "oauth_failed" }));
		}

		return c.html(getStatusPageHtml(result.title, result.message));
	},
	async handleAppEmailSignIn(c: AppContext) {
		try {
			const payload = appEmailSignInBodySchema.parse(await c.req.json());
			const result = await resolveEmailSignIn({
				callbackURL: payload.callbackURL,
				email: payload.email,
				password: payload.password,
				publicBaseURL: getPublicBaseUrlFromContext(),
			});

			return jsonSuccess(c, result);
		} catch (error) {
			if (error instanceof z.ZodError) {
				return handleControllerError(c, error, { withValidation: true });
			}

			Logger.warn("Auth", "Failed to resolve app email sign-in", error);
			return jsonSuccess(c, {
				code: "oauth_failed",
				message: "Unable to complete sign-in right now.",
				status: "terminal_error",
			});
		}
	},
	async handleAppEmailSignUp(c: AppContext) {
		try {
			const payload = appEmailSignUpBodySchema.parse(await c.req.json());
			const result = await resolveEmailSignUp({
				callbackURL: payload.callbackURL,
				email: payload.email,
				name: payload.name,
				password: payload.password,
				publicBaseURL: getPublicBaseUrlFromContext(),
				username: payload.username,
			});

			return jsonSuccess(c, result);
		} catch (error) {
			if (error instanceof z.ZodError) {
				return handleControllerError(c, error, { withValidation: true });
			}

			Logger.warn("Auth", "Failed to resolve app email sign-up", error);
			return jsonSuccess(c, {
				code: "oauth_failed",
				message: "Unable to complete sign-up right now.",
				status: "terminal_error",
			});
		}
	},
	async handleAppGoogleContinue(c: AppContext) {
		try {
			const payload = appGoogleContinueBodySchema.parse(await c.req.json());
			const profile = await verifyGoogleIdToken(payload.idToken);
			const result = await resolveGoogleContinue(toProviderAccount(profile, { idToken: payload.idToken }), {
				callbackURL: payload.callbackURL,
				publicBaseURL: getPublicBaseUrlFromContext(),
			});

			return jsonSuccess(c, result);
		} catch (error) {
			if (error instanceof HttpServiceError) {
				return jsonSuccess(c, terminalFlowFromHttpError(error));
			}

			if (error instanceof z.ZodError) {
				return handleControllerError(c, error, { withValidation: true });
			}

			Logger.warn("Auth", "Failed to resolve app Google continue flow", error);
			return jsonSuccess(c, {
				code: "oauth_failed",
				message: "Unable to continue with Google right now.",
				status: "terminal_error",
			});
		}
	},
	async handleAppGoogleLink(c: AppContext) {
		try {
			const session = await auth.api.getSession({ headers: c.req.raw.headers });
			if (!session?.user) {
				return c.json(error("UNAUTHORIZED", "Please login to continue"), 401);
			}

			const payload = appGoogleLinkBodySchema.parse(await c.req.json());
			const profile = await verifyGoogleIdToken(payload.idToken);
			const result = await resolveAuthenticatedGoogleLink(
				session.user.id,
				toProviderAccount(profile, { idToken: payload.idToken }),
			);

			return jsonSuccess(c, result);
		} catch (error) {
			if (error instanceof HttpServiceError) {
				return jsonSuccess(c, terminalFlowFromHttpError(error));
			}

			if (error instanceof z.ZodError) {
				return handleControllerError(c, error, { withValidation: true });
			}

			Logger.warn("Auth", "Failed to resolve authenticated Google link", error);
			return jsonSuccess(c, {
				code: "oauth_failed",
				message: "Unable to link Google right now.",
				status: "terminal_error",
			});
		}
	},
	async handleAppPasswordHelp(c: AppContext) {
		try {
			const payload = appPasswordHelpBodySchema.parse(await c.req.json());
			const result = await resolvePasswordHelp({
				callbackURL: payload.callbackURL,
				email: payload.email,
				publicBaseURL: getPublicBaseUrlFromContext(),
			});

			return jsonSuccess(c, result);
		} catch (error) {
			if (error instanceof z.ZodError) {
				return handleControllerError(c, error, { withValidation: true });
			}

			Logger.warn("Auth", "Failed to resolve password help flow", error);
			return jsonSuccess(c, {
				code: "oauth_failed",
				message: "Unable to start password help right now.",
				status: "terminal_error",
			});
		}
	},
	async handleAppPasswordSetup(c: AppContext) {
		try {
			const { isJson, payload } = await readPasswordSetupSubmission(c);
			const result = await completePasswordSetup(payload.token, payload.newPassword);

			if (result.kind === "error") {
				if (isJson) {
					return c.json(error("PASSWORD_SETUP_FAILED", result.message), 400);
				}

				if (result.renderForm && result.email) {
					return c.html(getPasswordSetupPageHtml(result.email, payload.token, result.message), 400);
				}

				return c.html(getStatusPageHtml(result.title, result.message), 400);
			}

			if (result.callbackURL && result.redirectToken) {
				return c.redirect(buildCallbackRedirectURL(result.callbackURL, { token: result.redirectToken }));
			}

			if (result.callbackURL && !result.redirectToken) {
				return c.redirect(buildCallbackRedirectURL(result.callbackURL, { error: "oauth_failed" }));
			}

			if (isJson) {
				return jsonSuccess(c, { status: true });
			}

			return c.html(getStatusPageHtml(result.title, result.message));
		} catch (error) {
			if (error instanceof z.ZodError) {
				return handleControllerError(c, error, { withValidation: true });
			}

			Logger.warn("Auth", "Failed to complete password setup flow", error);
			return c.html(getStatusPageHtml("Unable to save password", "Please try again later."), 500);
		}
	},
	async handleAppResultExchange(c: AppContext) {
		try {
			const payload = appResultExchangeBodySchema.parse(await c.req.json());
			const authResponse = await auth.api.verifyOneTimeToken({
				asResponse: true,
				body: { token: payload.token },
				headers: c.req.raw.headers,
			});

			const responsePayload = (await authResponse.json().catch(() => null)) as
				| { error?: string; message?: string }
				| {
						session: { token: string };
						user: { email: string; id: string; image?: string | null; name: string };
				  }
				| null;

			if (!authResponse.ok) {
				const errorPayload = responsePayload as { error?: string; message?: string } | null;

				return jsonWithHeaders(
					error(
						typeof errorPayload?.error === "string" ? errorPayload.error : "invalid_token",
						typeof errorPayload?.message === "string" ? errorPayload.message : "Invalid or expired token.",
					),
					authResponse.status,
					authResponse.headers,
				);
			}

			const data = responsePayload as {
				session: { token: string };
				user: { email: string; id: string; image?: string | null; name: string };
			};

			return jsonWithHeaders(
				success({
					token: data.session.token,
					user: {
						email: data.user.email,
						id: data.user.id,
						image: data.user.image ?? null,
						name: data.user.name,
					},
				}),
				authResponse.status,
				authResponse.headers,
			);
		} catch (err) {
			if (err instanceof z.ZodError) {
				return handleControllerError(c, err, { withValidation: true });
			}

			Logger.warn("Auth", "Failed to exchange auth result token", err);
			return c.json(error("invalid_token", "Invalid or expired token."), 400);
		}
	},
	async handleDesktopGoogleStart(c: AppContext) {
		const flow = getDesktopAuthFlow(c);
		const attempt = c.req.query("attempt") ?? undefined;
		const callbackUrl = c.req.query("callback_url") ?? undefined;

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
	},
	async handleGoogleCallback(c: AppContext) {
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

		try {
			const payload = JSON.parse(storedState.value) as Partial<DesktopGoogleStatePayload>;
			attempt = typeof payload.attempt === "string" ? payload.attempt : undefined;
			callbackUrl = typeof payload.callbackUrl === "string" ? payload.callbackUrl : undefined;
			codeVerifier = typeof payload.codeVerifier === "string" ? payload.codeVerifier : "";
			flow = payload.flow === "signup" ? "signup" : "login";
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
	},
	async handleMobileGoogleAuth(c: AppContext) {
		return await authController.handleAppGoogleContinue(c);
	},
};

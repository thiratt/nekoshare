import { z } from "zod";

import { handleAccountAvatarRead, handleAccountAvatarUpload } from "./auth-avatar.controller";
import {
	handleAppGoogleContinue,
	handleAppGoogleLink,
	handleDesktopGoogleStart,
	handleGoogleCallback,
	handleMobileGoogleAuth,
} from "./auth-google.controller";
import {
	buildCallbackRedirectURL,
	completePasswordSetup,
	consumeAuthChallenge,
	getPublicBaseURL,
	resolveEmailSignIn,
	resolveEmailSignUp,
	resolvePasswordHelp,
} from "./lib/app-auth";
import { getPasswordSetupPageHtml, getStatusPageHtml } from "./lib/app-auth-pages";

import { Logger } from "@/infrastructure/logger";
import { auth } from "@/modules/auth/lib";
import { handleControllerError, jsonSuccess } from "@/shared/http";
import type { AppContext } from "@/shared/http/router";
import { error, success } from "@/types";
import { getServerT, resolveRequestLanguage } from "@workspace/i18n/server";

const appEmailSignInBodySchema = z.object({
	callbackURL: z.string().url().optional(),
	email: z.string().email(),
	language: z.enum(["th", "en"]).optional(),
	password: z.string().min(1),
});

const appEmailSignUpBodySchema = z.object({
	callbackURL: z.string().url().optional(),
	email: z.string().email(),
	language: z.enum(["th", "en"]).optional(),
	name: z.string().trim().min(1),
	password: z.string().min(1),
	username: z.string().trim().min(1).optional(),
});

const appPasswordHelpBodySchema = z.object({
	callbackURL: z.string().url().optional(),
	email: z.string().email(),
	language: z.enum(["th", "en"]).optional(),
});

const appResultExchangeBodySchema = z.object({
	token: z.string().min(1),
});

const passwordSetupBodySchema = z.object({
	language: z.enum(["th", "en"]).optional(),
	newPassword: z.string().min(1),
	token: z.string().min(1),
});

const accountSetPasswordBodySchema = z.object({
	newPassword: z.string().min(1),
});

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

async function getAccountStatusErrorContent(language: string, kind: string, errorCode?: string) {
	const t = await getServerT(language);
	const normalizedKind = kind.trim().toLowerCase();
	const normalizedCode = errorCode?.trim().toLowerCase();

	if (normalizedKind === "email-change") {
		if (!normalizedCode) {
			return {
				message: t("serverAuth.accountStatus.emailChange.successMessage"),
				status: 200,
				title: t("serverAuth.accountStatus.emailChange.successTitle"),
			};
		}

		switch (normalizedCode) {
			case "invalid_token":
				return {
					message: t("serverAuth.accountStatus.emailChange.invalidMessage"),
					status: 400,
					title: t("serverAuth.accountStatus.emailChange.invalidTitle"),
				};
			case "token_expired":
				return {
					message: t("serverAuth.accountStatus.emailChange.expiredMessage"),
					status: 400,
					title: t("serverAuth.accountStatus.emailChange.expiredTitle"),
				};
			case "invalid_user":
				return {
					message: t("serverAuth.accountStatus.emailChange.wrongUserMessage"),
					status: 400,
					title: t("serverAuth.accountStatus.emailChange.wrongUserTitle"),
				};
			case "user_not_found":
				return {
					message: t("serverAuth.accountStatus.emailChange.accountNotFoundMessage"),
					status: 404,
					title: t("serverAuth.accountStatus.emailChange.accountNotFoundTitle"),
				};
			default:
				return {
					message: t("serverAuth.accountStatus.emailChange.invalidMessage"),
					status: 400,
					title: t("serverAuth.accountStatus.emailChange.invalidTitle"),
				};
		}
	}

	if (!normalizedCode) {
		return {
			message: t("serverAuth.accountStatus.defaultSuccessMessage"),
			status: 200,
			title: t("serverAuth.accountStatus.defaultSuccessTitle"),
		};
	}

	return {
		message: t("serverAuth.accountStatus.defaultErrorMessage"),
		status: 400,
		title: t("serverAuth.accountStatus.defaultErrorTitle"),
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
			language: formData.get("language"),
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
			const language = await getContextLanguage(c);
			const t = await getServerT(language);
			return c.json(error("SET_PASSWORD_FAILED", t("serverAuth.pages.passwordSaveFailed.message")), 500);
		}
	},
	async handleAccountStatus(c: AppContext) {
		const language = await getContextLanguage(c, c.req.query("lng"), { includeSession: true });
		const kind = c.req.query("kind") ?? "default";
		const errorCode = c.req.query("error") ?? undefined;
		const statusContent = await getAccountStatusErrorContent(language, kind, errorCode);

		return c.html(await getStatusPageHtml(language, statusContent.title, statusContent.message), statusContent.status as 200 | 400 | 404);
	},
	handleAccountAvatarRead,
	handleAccountAvatarUpload,
	async handleAppChallengeConsume(c: AppContext) {
		const language = await getContextLanguage(c, c.req.query("lng"));
		const t = await getServerT(language);
		const token = c.req.query("token");
		if (!token) {
			return c.html(
				await getStatusPageHtml(
					language,
					t("serverAuth.pages.invalidRequest.title"),
					t("serverAuth.pages.invalidRequest.message"),
				),
				400,
			);
		}

		const result = await consumeAuthChallenge(token, language);

		if (result.kind === "render_setup_password_form") {
			return c.html(await getPasswordSetupPageHtml(result.email, token, undefined, language));
		}

		if (result.kind === "error") {
			if (result.callbackURL) {
				return c.redirect(
					buildCallbackRedirectURL(result.callbackURL, { error: "invalid_or_expired_challenge" }),
				);
			}

			return c.html(await getStatusPageHtml(language, result.title, result.message), 400);
		}

		if (result.callbackURL && result.redirectToken) {
			return c.redirect(buildCallbackRedirectURL(result.callbackURL, { token: result.redirectToken }));
		}

		if (result.callbackURL && !result.redirectToken) {
			return c.redirect(buildCallbackRedirectURL(result.callbackURL, { error: "oauth_failed" }));
		}

		return c.html(await getStatusPageHtml(language, result.title, result.message));
	},
	async handleAppEmailSignIn(c: AppContext) {
		try {
			const payload = appEmailSignInBodySchema.parse(await c.req.json());
			const result = await resolveEmailSignIn({
				callbackURL: payload.callbackURL,
				email: payload.email,
				language: payload.language,
				password: payload.password,
				publicBaseURL: getPublicBaseUrlFromContext(),
			});

			return jsonSuccess(c, result);
		} catch (error) {
			if (error instanceof z.ZodError) {
				return handleControllerError(c, error, { withValidation: true });
			}

			Logger.warn("Auth", "Failed to resolve app email sign-in", error);
			const language = await getContextLanguage(c);
			const t = await getServerT(language);
			return jsonSuccess(c, {
				code: "oauth_failed",
				message: t("errors.auth.codes.oauth_failed"),
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
				language: payload.language,
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
			const language = await getContextLanguage(c);
			const t = await getServerT(language);
			return jsonSuccess(c, {
				code: "oauth_failed",
				message: t("errors.auth.codes.oauth_failed"),
				status: "terminal_error",
			});
		}
	},
	handleAppGoogleContinue,
	handleAppGoogleLink,
	async handleAppPasswordHelp(c: AppContext) {
		try {
			const payload = appPasswordHelpBodySchema.parse(await c.req.json());
			const result = await resolvePasswordHelp({
				callbackURL: payload.callbackURL,
				email: payload.email,
				language: payload.language,
				publicBaseURL: getPublicBaseUrlFromContext(),
			});

			return jsonSuccess(c, result);
		} catch (error) {
			if (error instanceof z.ZodError) {
				return handleControllerError(c, error, { withValidation: true });
			}

			Logger.warn("Auth", "Failed to resolve password help flow", error);
			const language = await getContextLanguage(c);
			const t = await getServerT(language);
			return jsonSuccess(c, {
				code: "oauth_failed",
				message: t("errors.auth.codes.oauth_failed"),
				status: "terminal_error",
			});
		}
	},
	async handleAppPasswordSetup(c: AppContext) {
		try {
			const { isJson, payload } = await readPasswordSetupSubmission(c);
			const language = await getContextLanguage(c, payload.language ?? c.req.query("lng"));
			const result = await completePasswordSetup(payload.token, payload.newPassword, language);

			if (result.kind === "error") {
				if (isJson) {
					return c.json(error("PASSWORD_SETUP_FAILED", result.message), 400);
				}

				if (result.renderForm && result.email) {
					return c.html(await getPasswordSetupPageHtml(result.email, payload.token, result.message, language), 400);
				}

				return c.html(await getStatusPageHtml(language, result.title, result.message), 400);
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

			return c.html(await getStatusPageHtml(language, result.title, result.message));
		} catch (error) {
			if (error instanceof z.ZodError) {
				return handleControllerError(c, error, { withValidation: true });
			}

			Logger.warn("Auth", "Failed to complete password setup flow", error);
			const language = await getContextLanguage(c);
			const t = await getServerT(language);
			return c.html(
				await getStatusPageHtml(
					language,
					t("serverAuth.pages.passwordSaveFailed.title"),
					t("serverAuth.pages.passwordSaveFailed.message"),
				),
				500,
			);
		}
	},
	async handleAppResultExchange(c: AppContext) {
		try {
			const language = await getContextLanguage(c);
			const t = await getServerT(language);
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
						typeof errorPayload?.message === "string"
							? errorPayload.message
							: t("serverAuth.flow.errors.tokenInvalid"),
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
			const language = await getContextLanguage(c);
			const t = await getServerT(language);
			return c.json(error("invalid_token", t("serverAuth.flow.errors.tokenInvalid")), 400);
		}
	},
	handleDesktopGoogleStart,
	handleGoogleCallback,
	handleMobileGoogleAuth,
};

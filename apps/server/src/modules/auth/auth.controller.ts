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

const passwordSetupBodySchema = z.object({
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
	handleAccountAvatarRead,
	handleAccountAvatarUpload,
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
	handleAppGoogleContinue,
	handleAppGoogleLink,
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
	handleDesktopGoogleStart,
	handleGoogleCallback,
	handleMobileGoogleAuth,
};

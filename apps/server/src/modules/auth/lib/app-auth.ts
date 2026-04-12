import { generateRandomString } from "better-auth/crypto";

import { createLinkProviderEmailHtml, createSetupPasswordEmailHtml, sendAuthEmail } from "./email";

import { env } from "@/config/env";
import { Logger } from "@/infrastructure/logger";
import { auth } from "@/modules/auth/lib";
import { hashPassword, verifyPassword } from "@/modules/auth/lib/password-hash";
import type {
	AuthActionRequiredCode,
	AuthChallengeAction,
	AuthFlowResult,
	AuthTerminalErrorCode,
	AuthUserSummary,
} from "@workspace/contracts/api";

const AUTH_CHALLENGE_PREFIX = "auth-challenge:";
const AUTH_CHALLENGE_TTL_MS = 15 * 60 * 1000;
const LOOPBACK_CALLBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);
const OTT_PREFIX = "one-time-token:";
const RESULT_TOKEN_TTL_MS = 5 * 60 * 1000;
const SUPPORTED_ANDROID_CALLBACK = "nekoshare://auth/complete";

interface AppAuthRequestContext {
	callbackURL?: string;
	publicBaseURL: string;
}

export interface ProviderAccountPayload {
	accessToken?: string;
	accessTokenExpiresAt?: Date;
	accountId: string;
	email: string;
	emailVerified: boolean;
	idToken?: string;
	image?: string;
	name: string;
	providerId: string;
	refreshToken?: string;
	refreshTokenExpiresAt?: Date;
	scope?: string;
}

interface StoredProviderAccountPayload {
	accessToken?: string;
	accessTokenExpiresAt?: string;
	accountId: string;
	email: string;
	emailVerified: boolean;
	idToken?: string;
	image?: string;
	name: string;
	providerId: string;
	refreshToken?: string;
	refreshTokenExpiresAt?: string;
	scope?: string;
}

interface LinkProviderChallengePayload {
	account: StoredProviderAccountPayload;
	callbackURL?: string;
	email: string;
	type: "link_provider";
	userId: string;
}

interface SetupPasswordChallengePayload {
	callbackURL?: string;
	email: string;
	type: "setup_password";
	userId: string;
}

type AuthChallengePayload = LinkProviderChallengePayload | SetupPasswordChallengePayload;

type ChallengeConsumeResult =
	| {
			callbackURL?: string;
			kind: "error";
			message: string;
			title: string;
	  }
	| {
			callbackURL?: string;
			kind: "link_provider_completed";
			message: string;
			redirectToken?: string;
			title: string;
	  }
	| {
			email: string;
			kind: "render_setup_password_form";
	  };

type CompletePasswordSetupResult =
	| {
			callbackURL?: string;
			email?: string;
			kind: "error";
			message: string;
			renderForm?: boolean;
			title: string;
	  }
	| {
			callbackURL?: string;
			kind: "success";
			message: string;
			redirectToken?: string;
			title: string;
	  };

function buildUsername(name: string, email: string): string {
	const preferredBase = sanitizeUsername(name);
	const emailBase = sanitizeUsername(email.split("@")[0] ?? "");
	const numericHash = Array.from(email.trim().toLowerCase()).reduce((hash, character) => {
		return Math.imul(31, hash) + character.charCodeAt(0);
	}, 0);
	const suffix = Math.abs(numericHash).toString(16).slice(-4) || "user";
	const fallbackBase = emailBase || "member";
	const base = preferredBase || fallbackBase;
	const maxBaseLength = Math.max(2, 20 - suffix.length - 1);
	const normalizedBase = (base.slice(0, maxBaseLength) || "member".slice(0, maxBaseLength)).replace(
		/^[._-]+|[._-]+$/g,
		"",
	);

	return `${normalizedBase || "member"}-${suffix}`;
}

function createAppUserSummary(user: {
	email: string;
	id: string;
	image?: string | null;
	name: string;
}): AuthUserSummary {
	return {
		email: user.email,
		id: user.id,
		image: user.image ?? null,
		name: user.name,
	};
}

function createActionRequiredResult(
	action: AuthChallengeAction,
	code: AuthActionRequiredCode,
	email: string,
	message: string,
): AuthFlowResult {
	return {
		action,
		code,
		email,
		message,
		status: "action_required",
	};
}

function createTerminalErrorResult(code: AuthTerminalErrorCode, message: string): AuthFlowResult {
	return {
		code,
		message,
		status: "terminal_error",
	};
}

function defaultName(name: string | undefined, email: string): string {
	const normalized = name?.trim();
	if (normalized && normalized.length > 0) {
		return normalized;
	}

	return email.split("@")[0] || "Member";
}

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

function findCredentialAccount(accounts: Array<{ password?: string | null; providerId: string }>) {
	return accounts.find((account) => account.providerId === "credential" && !!account.password);
}

function getChallengeIdentifier(token: string): string {
	return `${AUTH_CHALLENGE_PREFIX}${token}`;
}

export function normalizeCallbackURL(input?: string): string | undefined {
	if (!input) {
		return undefined;
	}

	try {
		const callbackURL = new URL(input);
		if (
			callbackURL.protocol === "http:" &&
			LOOPBACK_CALLBACK_HOSTS.has(callbackURL.hostname.toLowerCase()) &&
			callbackURL.port
		) {
			return callbackURL.toString();
		}

		if (
			callbackURL.protocol === "nekoshare:" &&
			`${callbackURL.protocol}//${callbackURL.hostname}${callbackURL.pathname}` === SUPPORTED_ANDROID_CALLBACK
		) {
			return `${callbackURL.protocol}//${callbackURL.hostname}${callbackURL.pathname}`;
		}
	} catch {
		Logger.warn("Auth", "Received invalid auth callback URL");
	}

	return undefined;
}

function normalizeEmail(email: string): string {
	return email.trim().toLowerCase();
}

function serializeProviderAccount(account: ProviderAccountPayload): StoredProviderAccountPayload {
	return {
		accessToken: account.accessToken,
		accessTokenExpiresAt: account.accessTokenExpiresAt?.toISOString(),
		accountId: account.accountId,
		email: account.email,
		emailVerified: account.emailVerified,
		idToken: account.idToken,
		image: account.image,
		name: account.name,
		providerId: account.providerId,
		refreshToken: account.refreshToken,
		refreshTokenExpiresAt: account.refreshTokenExpiresAt?.toISOString(),
		scope: account.scope,
	};
}

function deserializeProviderAccount(account: StoredProviderAccountPayload): ProviderAccountPayload {
	return {
		accessToken: account.accessToken,
		accessTokenExpiresAt: account.accessTokenExpiresAt ? new Date(account.accessTokenExpiresAt) : undefined,
		accountId: account.accountId,
		email: account.email,
		emailVerified: account.emailVerified,
		idToken: account.idToken,
		image: account.image,
		name: account.name,
		providerId: account.providerId,
		refreshToken: account.refreshToken,
		refreshTokenExpiresAt: account.refreshTokenExpiresAt ? new Date(account.refreshTokenExpiresAt) : undefined,
		scope: account.scope,
	};
}

function sanitizeUsername(value: string): string {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9_.-]/g, "")
		.replace(/^[._-]+|[._-]+$/g, "");
}

function statusPageHtml(title: string, message: string, detail?: string): string {
	const safeTitle = escapeHtml(title);
	const safeMessage = escapeHtml(message);
	const safeDetail = detail ? `<p style="margin:0;color:#6b7280;font-size:13px;">${escapeHtml(detail)}</p>` : "";

	return [
		"<!doctype html>",
		'<html lang="en">',
		"<head>",
		'<meta charset="utf-8" />',
		'<meta name="viewport" content="width=device-width, initial-scale=1" />',
		`<title>${safeTitle}</title>`,
		"<style>",
		':root{color-scheme:light;font-family:"Segoe UI",Arial,sans-serif;background:#f8f5ee;color:#1f2937;}',
		"body{margin:0;min-height:100vh;display:grid;place-items:center;background:radial-gradient(circle at top,rgba(221,180,128,.28),transparent 42%),linear-gradient(180deg,#fffaf3 0%,#f4ead8 100%);}",
		"main{width:min(520px,calc(100vw - 32px));padding:32px 28px;border-radius:24px;background:rgba(255,255,255,.94);box-shadow:0 24px 80px rgba(74,55,40,.14);border:1px solid rgba(125,89,58,.1);display:grid;gap:14px;}",
		"h1{margin:0;font-size:28px;line-height:1.15;}",
		"p{margin:0;line-height:1.6;color:#4b5563;}",
		"</style>",
		"</head>",
		"<body>",
		"<main>",
		`<h1>${safeTitle}</h1>`,
		`<p>${safeMessage}</p>`,
		safeDetail,
		"</main>",
		"</body>",
		"</html>",
	].join("");
}

function setupPasswordFormHtml(email: string, token: string, error?: string): string {
	const safeEmail = escapeHtml(email);
	const safeToken = escapeHtml(token);
	const errorBlock = error
		? `<p style="margin:0;padding:12px 14px;border-radius:14px;background:#fff1f2;color:#b91c1c;border:1px solid rgba(185,28,28,.16);">${escapeHtml(error)}</p>`
		: "";

	return [
		"<!doctype html>",
		'<html lang="en">',
		"<head>",
		'<meta charset="utf-8" />',
		'<meta name="viewport" content="width=device-width, initial-scale=1" />',
		"<title>Set password</title>",
		"<style>",
		':root{color-scheme:light;font-family:"Segoe UI",Arial,sans-serif;background:#f8f5ee;color:#1f2937;}',
		"body{margin:0;min-height:100vh;display:grid;place-items:center;background:radial-gradient(circle at top,rgba(221,180,128,.28),transparent 42%),linear-gradient(180deg,#fffaf3 0%,#f4ead8 100%);}",
		"main{width:min(520px,calc(100vw - 32px));padding:32px 28px;border-radius:24px;background:rgba(255,255,255,.94);box-shadow:0 24px 80px rgba(74,55,40,.14);border:1px solid rgba(125,89,58,.1);display:grid;gap:16px;}",
		"h1{margin:0;font-size:28px;line-height:1.15;}",
		"p{margin:0;line-height:1.6;color:#4b5563;}",
		"label{display:grid;gap:8px;font-weight:600;color:#111827;}",
		"input{width:100%;padding:14px 16px;border-radius:14px;border:1px solid rgba(107,114,128,.28);font:inherit;box-sizing:border-box;}",
		"button{padding:14px 18px;border:0;border-radius:14px;background:#a35b2c;color:#fff;font:inherit;font-weight:700;cursor:pointer;}",
		"button:hover{background:#8b4d24;}",
		"</style>",
		"</head>",
		"<body>",
		"<main>",
		"<h1>Set your password</h1>",
		`<p>Choose a new password for <strong>${safeEmail}</strong>.</p>`,
		errorBlock,
		'<form method="post" action="/auth/app/password/setup" style="display:grid;gap:16px;">',
		`<input type="hidden" name="token" value="${safeToken}" />`,
		'<label>New password<input type="password" name="newPassword" minlength="8" maxlength="128" autocomplete="new-password" required /></label>',
		'<button type="submit">Save password</button>',
		"</form>",
		"</main>",
		"</body>",
		"</html>",
	].join("");
}

async function createChallenge(payload: AuthChallengePayload): Promise<string> {
	const authContext = await auth.$context;
	const token = generateRandomString(48);

	await authContext.internalAdapter.createVerificationValue({
		expiresAt: new Date(Date.now() + AUTH_CHALLENGE_TTL_MS),
		identifier: getChallengeIdentifier(token),
		value: JSON.stringify(payload),
	});

	return token;
}

async function createResultTokenForUser(userId: string): Promise<AuthFlowResult> {
	const authContext = await auth.$context;
	const user = await authContext.internalAdapter.findUserById(userId);
	if (!user) {
		return createTerminalErrorResult("user_not_found", "User was not found.");
	}

	const session = await authContext.internalAdapter.createSession(userId);
	const token = generateRandomString(32);

	await authContext.internalAdapter.createVerificationValue({
		expiresAt: new Date(Date.now() + RESULT_TOKEN_TTL_MS),
		identifier: `${OTT_PREFIX}${token}`,
		value: session.token,
	});

	return {
		resultToken: { token },
		status: "signed_in",
		user: createAppUserSummary(user),
	};
}

async function deleteChallenge(token: string) {
	const authContext = await auth.$context;
	await authContext.internalAdapter.deleteVerificationByIdentifier(getChallengeIdentifier(token));
}

async function findUserByEmail(email: string) {
	const authContext = await auth.$context;
	return await authContext.internalAdapter.findUserByEmail(normalizeEmail(email), {
		includeAccounts: true,
	});
}

function buildChallengeLink(publicBaseURL: string, token: string): string {
	return `${publicBaseURL.replace(/\/+$/, "")}/auth/app/challenge/consume?token=${encodeURIComponent(token)}`;
}

export function buildCallbackRedirectURL(callbackURL: string, params: { error?: string; token?: string }): string {
	const redirectURL = new URL(callbackURL);

	if (params.token) {
		redirectURL.searchParams.set("token", params.token);
	} else {
		redirectURL.searchParams.delete("token");
	}

	if (params.error) {
		redirectURL.searchParams.set("error", params.error);
	} else {
		redirectURL.searchParams.delete("error");
	}

	return redirectURL.toString();
}

async function sendLinkProviderChallenge(
	userId: string,
	account: ProviderAccountPayload,
	requestContext: AppAuthRequestContext,
): Promise<AuthFlowResult> {
	const token = await createChallenge({
		account: serializeProviderAccount(account),
		callbackURL: normalizeCallbackURL(requestContext.callbackURL),
		email: account.email,
		type: "link_provider",
		userId,
	});
	const linkURL = buildChallengeLink(requestContext.publicBaseURL, token);
	const sent = await sendAuthEmail({
		html: createLinkProviderEmailHtml(account.email, "Google", linkURL),
		subject: "Confirm your Google sign-in",
		text: `Open this link to link Google to your Nekoshare account: ${linkURL}`,
		to: account.email,
	});

	if (!sent) {
		await deleteChallenge(token);
		return createTerminalErrorResult(
			"email_delivery_unavailable",
			"Email delivery is unavailable right now. Please try again later.",
		);
	}

	return createActionRequiredResult(
		"link_provider",
		"link_provider_email_sent",
		account.email,
		"We sent a confirmation email to continue linking Google.",
	);
}

async function sendSetupPasswordChallenge(
	userId: string,
	email: string,
	requestContext: AppAuthRequestContext,
): Promise<AuthFlowResult> {
	const normalizedEmail = normalizeEmail(email);
	const token = await createChallenge({
		callbackURL: normalizeCallbackURL(requestContext.callbackURL),
		email: normalizedEmail,
		type: "setup_password",
		userId,
	});
	const linkURL = buildChallengeLink(requestContext.publicBaseURL, token);
	const sent = await sendAuthEmail({
		html: createSetupPasswordEmailHtml(normalizedEmail, linkURL),
		subject: "Set your Nekoshare password",
		text: `Open this link to set your Nekoshare password: ${linkURL}`,
		to: normalizedEmail,
	});

	if (!sent) {
		await deleteChallenge(token);
		return createTerminalErrorResult(
			"email_delivery_unavailable",
			"Email delivery is unavailable right now. Please try again later.",
		);
	}

	return createActionRequiredResult(
		"setup_password",
		"setup_password_email_sent",
		normalizedEmail,
		"We sent a secure password setup email.",
	);
}

async function upsertEmailVerified(userId: string) {
	const authContext = await auth.$context;
	const user = await authContext.internalAdapter.findUserById(userId);
	if (!user?.emailVerified) {
		await authContext.internalAdapter.updateUser(userId, { emailVerified: true });
	}
}

async function createCredentialUser(params: { email: string; name: string; password: string; username?: string }) {
	const authContext = await auth.$context;
	const passwordHash = await hashPassword(params.password);
	const createdUser = await authContext.internalAdapter.createUser({
		email: normalizeEmail(params.email),
		emailVerified: false,
		name: params.name,
		username: params.username || buildUsername(params.name, params.email),
	});

	await authContext.internalAdapter.linkAccount({
		accountId: createdUser.id,
		password: passwordHash,
		providerId: "credential",
		userId: createdUser.id,
	});

	return createdUser;
}

async function createProviderUser(account: ProviderAccountPayload) {
	const authContext = await auth.$context;
	const createdUser = await authContext.internalAdapter.createUser({
		email: normalizeEmail(account.email),
		emailVerified: true,
		image: account.image,
		name: defaultName(account.name, account.email),
	});

	await authContext.internalAdapter.linkAccount({
		accessToken: account.accessToken,
		accessTokenExpiresAt: account.accessTokenExpiresAt,
		accountId: account.accountId,
		idToken: account.idToken,
		providerId: account.providerId,
		refreshToken: account.refreshToken,
		refreshTokenExpiresAt: account.refreshTokenExpiresAt,
		scope: account.scope,
		userId: createdUser.id,
	});

	return createdUser;
}

async function readChallenge(token: string): Promise<AuthChallengePayload | null> {
	const authContext = await auth.$context;
	const verification = await authContext.internalAdapter.findVerificationValue(getChallengeIdentifier(token));
	if (!verification) {
		return null;
	}

	if (verification.expiresAt < new Date()) {
		await authContext.internalAdapter.deleteVerificationByIdentifier(getChallengeIdentifier(token));
		return null;
	}

	try {
		return JSON.parse(verification.value) as AuthChallengePayload;
	} catch (error) {
		Logger.warn("Auth", "Failed to parse auth challenge payload", error);
		await authContext.internalAdapter.deleteVerificationByIdentifier(getChallengeIdentifier(token));
		return null;
	}
}

export function getPasswordSetupPageHtml(email: string, token: string, error?: string): string {
	return setupPasswordFormHtml(email, token, error);
}

export function getStatusPageHtml(title: string, message: string, detail?: string): string {
	return statusPageHtml(title, message, detail);
}

export async function consumeAuthChallenge(token: string): Promise<ChallengeConsumeResult> {
	const challenge = await readChallenge(token);
	if (!challenge) {
		return {
			kind: "error",
			message: "This verification link is invalid or has expired.",
			title: "Link expired",
		};
	}

	if (challenge.type === "setup_password") {
		return {
			email: challenge.email,
			kind: "render_setup_password_form",
		};
	}

	const account = deserializeProviderAccount(challenge.account);
	const authContext = await auth.$context;
	const existing = await authContext.internalAdapter.findOAuthUser(
		account.email,
		account.accountId,
		account.providerId,
	);

	if (existing?.linkedAccount && existing.user.id !== challenge.userId) {
		await deleteChallenge(token);
		return {
			callbackURL: challenge.callbackURL,
			kind: "error",
			message: "This Google account is already linked to another Nekoshare user.",
			title: "Unable to link account",
		};
	}

	if (!existing?.linkedAccount) {
		const user = await authContext.internalAdapter.findUserById(challenge.userId);
		if (!user) {
			await deleteChallenge(token);
			return {
				callbackURL: challenge.callbackURL,
				kind: "error",
				message: "The requested user no longer exists.",
				title: "Unable to link account",
			};
		}

		await authContext.internalAdapter.linkAccount({
			accessToken: account.accessToken,
			accessTokenExpiresAt: account.accessTokenExpiresAt,
			accountId: account.accountId,
			idToken: account.idToken,
			providerId: account.providerId,
			refreshToken: account.refreshToken,
			refreshTokenExpiresAt: account.refreshTokenExpiresAt,
			scope: account.scope,
			userId: challenge.userId,
		});
	}

	await upsertEmailVerified(challenge.userId);
	await deleteChallenge(token);
	const result = await createResultTokenForUser(challenge.userId);

	if (result.status !== "signed_in") {
		return {
			callbackURL: challenge.callbackURL,
			kind: "error",
			message: result.message,
			title: "Unable to link account",
		};
	}

	return {
		callbackURL: challenge.callbackURL,
		kind: "link_provider_completed",
		message: "Google was linked successfully. You can return to the app.",
		redirectToken: result.resultToken.token,
		title: "Google linked",
	};
}

export async function completePasswordSetup(token: string, newPassword: string): Promise<CompletePasswordSetupResult> {
	const challenge = await readChallenge(token);
	if (!challenge || challenge.type !== "setup_password") {
		return {
			kind: "error",
			message: "This password setup link is invalid or has expired.",
			title: "Link expired",
		};
	}

	const authContext = await auth.$context;
	const minPasswordLength = authContext.password.config.minPasswordLength;
	const maxPasswordLength = authContext.password.config.maxPasswordLength;

	if (newPassword.length < minPasswordLength) {
		return {
			callbackURL: challenge.callbackURL,
			email: challenge.email,
			kind: "error",
			message: `Password must be at least ${minPasswordLength} characters long.`,
			renderForm: true,
			title: "Password is too short",
		};
	}

	if (newPassword.length > maxPasswordLength) {
		return {
			callbackURL: challenge.callbackURL,
			email: challenge.email,
			kind: "error",
			message: `Password must be at most ${maxPasswordLength} characters long.`,
			renderForm: true,
			title: "Password is too long",
		};
	}

	const user = await authContext.internalAdapter.findUserById(challenge.userId);
	if (!user) {
		await deleteChallenge(token);
		return {
			callbackURL: challenge.callbackURL,
			kind: "error",
			message: "The requested user no longer exists.",
			title: "Unable to save password",
		};
	}

	const accounts = await authContext.internalAdapter.findAccounts(challenge.userId);
	const credentialAccount = findCredentialAccount(accounts);
	const passwordHash = await hashPassword(newPassword);

	if (credentialAccount) {
		await authContext.internalAdapter.updatePassword(challenge.userId, passwordHash);
	} else {
		await authContext.internalAdapter.linkAccount({
			accountId: challenge.userId,
			password: passwordHash,
			providerId: "credential",
			userId: challenge.userId,
		});
	}

	await upsertEmailVerified(challenge.userId);
	await deleteChallenge(token);

	if (!challenge.callbackURL) {
		return {
			kind: "success",
			message: "Your password was saved successfully. Return to the app and sign in.",
			title: "Password updated",
		};
	}

	const result = await createResultTokenForUser(challenge.userId);
	if (result.status !== "signed_in") {
		return {
			callbackURL: challenge.callbackURL,
			kind: "error",
			message: result.message,
			title: "Unable to complete sign-in",
		};
	}

	return {
		callbackURL: challenge.callbackURL,
		kind: "success",
		message: "Your password was saved successfully.",
		redirectToken: result.resultToken.token,
		title: "Password updated",
	};
}

export function getPublicBaseURL(): string {
	return env.APP_PUBLIC_URL.replace(/\/+$/, "");
}

export async function resolveEmailSignIn(params: {
	callbackURL?: string;
	email: string;
	password: string;
	publicBaseURL: string;
}): Promise<AuthFlowResult> {
	const normalizedEmail = normalizeEmail(params.email);
	const existingUser = await findUserByEmail(normalizedEmail);
	if (!existingUser) {
		return createTerminalErrorResult("user_not_found", "User was not found.");
	}

	const credentialAccount = findCredentialAccount(existingUser.accounts);
	if (!credentialAccount?.password) {
		return await sendSetupPasswordChallenge(existingUser.user.id, normalizedEmail, {
			callbackURL: params.callbackURL,
			publicBaseURL: params.publicBaseURL,
		});
	}

	const isValidPassword = await verifyPassword(credentialAccount.password, params.password);
	if (!isValidPassword) {
		return createTerminalErrorResult("invalid_email_or_password", "Invalid email or password.");
	}

	return await createResultTokenForUser(existingUser.user.id);
}

export async function resolveEmailSignUp(params: {
	callbackURL?: string;
	email: string;
	name: string;
	password: string;
	publicBaseURL: string;
	username?: string;
}): Promise<AuthFlowResult> {
	const normalizedEmail = normalizeEmail(params.email);
	const existingUser = await findUserByEmail(normalizedEmail);
	if (existingUser) {
		if (findCredentialAccount(existingUser.accounts)) {
			return createTerminalErrorResult("email_already_exists", "This email address is already in use.");
		}

		return await sendSetupPasswordChallenge(existingUser.user.id, normalizedEmail, {
			callbackURL: params.callbackURL,
			publicBaseURL: params.publicBaseURL,
		});
	}

	try {
		const createdUser = await createCredentialUser({
			email: normalizedEmail,
			name: params.name,
			password: params.password,
			username: params.username,
		});
		return await createResultTokenForUser(createdUser.id);
	} catch (error) {
		Logger.warn("Auth", "Failed to create credential user during app auth sign-up", error);
		return createTerminalErrorResult("email_already_exists", "This email address is already in use.");
	}
}

export async function resolveGoogleContinue(
	account: ProviderAccountPayload,
	requestContext: AppAuthRequestContext,
): Promise<AuthFlowResult> {
	if (!account.email) {
		return createTerminalErrorResult("email_not_found", "The provider did not return an email address.");
	}

	if (!account.emailVerified) {
		return createTerminalErrorResult("email_not_verified", "The provider email address is not verified.");
	}

	const authContext = await auth.$context;
	const existing = await authContext.internalAdapter.findOAuthUser(
		account.email,
		account.accountId,
		account.providerId,
	);
	if (existing?.linkedAccount) {
		return await createResultTokenForUser(existing.user.id);
	}

	if (existing?.user) {
		return await sendLinkProviderChallenge(existing.user.id, account, requestContext);
	}

	try {
		const createdUser = await createProviderUser(account);
		return await createResultTokenForUser(createdUser.id);
	} catch (error) {
		Logger.warn("Auth", "Failed to create provider user during app auth continue flow", error);

		const fallbackUser = await findUserByEmail(account.email);
		if (fallbackUser?.user) {
			return await sendLinkProviderChallenge(fallbackUser.user.id, account, requestContext);
		}

		return createTerminalErrorResult("oauth_failed", "Unable to complete provider sign-in right now.");
	}
}

export async function resolvePasswordHelp(params: {
	callbackURL?: string;
	email: string;
	publicBaseURL: string;
}): Promise<AuthFlowResult> {
	const normalizedEmail = normalizeEmail(params.email);
	const existingUser = await findUserByEmail(normalizedEmail);
	if (!existingUser) {
		return createTerminalErrorResult("user_not_found", "User was not found.");
	}

	return await sendSetupPasswordChallenge(existingUser.user.id, normalizedEmail, {
		callbackURL: params.callbackURL,
		publicBaseURL: params.publicBaseURL,
	});
}

export async function resolveAuthenticatedGoogleLink(
	userId: string,
	account: ProviderAccountPayload,
): Promise<AuthFlowResult> {
	const authContext = await auth.$context;
	const existing = await authContext.internalAdapter.findOAuthUser(
		account.email,
		account.accountId,
		account.providerId,
	);
	if (existing?.linkedAccount && existing.user.id !== userId) {
		return createTerminalErrorResult(
			"account_already_linked_to_different_user",
			"This Google account is already linked to another Nekoshare user.",
		);
	}

	const accounts = await authContext.internalAdapter.findAccounts(userId);
	const currentProviderAccount = accounts.find((entry) => entry.providerId === account.providerId);
	if (currentProviderAccount && currentProviderAccount.accountId !== account.accountId) {
		return createTerminalErrorResult(
			"provider_requires_manual_link",
			"A different Google account is already linked.",
		);
	}

	if (!existing?.linkedAccount && !currentProviderAccount) {
		await authContext.internalAdapter.linkAccount({
			accessToken: account.accessToken,
			accessTokenExpiresAt: account.accessTokenExpiresAt,
			accountId: account.accountId,
			idToken: account.idToken,
			providerId: account.providerId,
			refreshToken: account.refreshToken,
			refreshTokenExpiresAt: account.refreshTokenExpiresAt,
			scope: account.scope,
			userId,
		});
	}

	return await createResultTokenForUser(userId);
}

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
import type { AppLanguage } from "@workspace/i18n/core";
import { getServerT } from "@workspace/i18n/server";

const AUTH_CHALLENGE_PREFIX = "auth-challenge:";
const AUTH_CHALLENGE_TTL_MS = 15 * 60 * 1000;
const LOOPBACK_CALLBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);
const OTT_PREFIX = "one-time-token:";
const RESULT_TOKEN_TTL_MS = 5 * 60 * 1000;
const SUPPORTED_ANDROID_CALLBACK = "nekoshare://auth/complete";

interface AppAuthRequestContext {
	callbackURL?: string;
	language?: AppLanguage;
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

function findCredentialAccount(accounts: Array<{ password?: string | null; providerId: string }>) {
	return accounts.find((account) => account.providerId === "credential" && !!account.password);
}

function getChallengeIdentifier(token: string): string {
	return `${AUTH_CHALLENGE_PREFIX}${token}`;
}

async function getFlowT(language?: string | null) {
	return await getServerT(language);
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

async function createResultTokenForUser(userId: string, language?: string | null): Promise<AuthFlowResult> {
	const authContext = await auth.$context;
	const user = await authContext.internalAdapter.findUserById(userId);
	if (!user) {
		const t = await getFlowT(language);
		return createTerminalErrorResult("user_not_found", t("errors.auth.codes.user_not_found"));
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

function buildChallengeLink(publicBaseURL: string, token: string, language?: string): string {
	const challengeUrl = new URL("/auth/app/challenge/consume", publicBaseURL.replace(/\/+$/, "") + "/");
	challengeUrl.searchParams.set("token", token);

	if (language) {
		challengeUrl.searchParams.set("lng", language);
	}

	return challengeUrl.toString();
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
	const t = await getFlowT(requestContext.language);
	const token = await createChallenge({
		account: serializeProviderAccount(account),
		callbackURL: normalizeCallbackURL(requestContext.callbackURL),
		email: account.email,
		type: "link_provider",
		userId,
	});
	const linkURL = buildChallengeLink(requestContext.publicBaseURL, token, requestContext.language);
	const sent = await sendAuthEmail({
		html: await createLinkProviderEmailHtml(account.email, "Google", linkURL, requestContext.language),
		subject: t("serverAuth.email.linkProvider.subject"),
		text: t("serverAuth.email.linkProvider.text", { url: linkURL }),
		to: account.email,
	});

	if (!sent) {
		await deleteChallenge(token);
		return createTerminalErrorResult(
			"email_delivery_unavailable",
			t("errors.auth.codes.email_delivery_unavailable"),
		);
	}

	return createActionRequiredResult(
		"link_provider",
		"link_provider_email_sent",
		account.email,
		t("serverAuth.flow.messages.linkProviderEmailSent"),
	);
}

async function sendSetupPasswordChallenge(
	userId: string,
	email: string,
	requestContext: AppAuthRequestContext,
): Promise<AuthFlowResult> {
	const t = await getFlowT(requestContext.language);
	const normalizedEmail = normalizeEmail(email);
	const token = await createChallenge({
		callbackURL: normalizeCallbackURL(requestContext.callbackURL),
		email: normalizedEmail,
		type: "setup_password",
		userId,
	});
	const linkURL = buildChallengeLink(requestContext.publicBaseURL, token, requestContext.language);
	const sent = await sendAuthEmail({
		html: await createSetupPasswordEmailHtml(normalizedEmail, linkURL, requestContext.language),
		subject: t("serverAuth.email.passwordSetup.subject"),
		text: t("serverAuth.email.passwordSetup.text", { url: linkURL }),
		to: normalizedEmail,
	});

	if (!sent) {
		await deleteChallenge(token);
		return createTerminalErrorResult(
			"email_delivery_unavailable",
			t("errors.auth.codes.email_delivery_unavailable"),
		);
	}

	return createActionRequiredResult(
		"setup_password",
		"setup_password_email_sent",
		normalizedEmail,
		t("serverAuth.flow.messages.passwordSetupEmailSent"),
	);
}

async function upsertEmailVerified(userId: string) {
	const authContext = await auth.$context;
	const user = await authContext.internalAdapter.findUserById(userId);
	if (!user?.emailVerified) {
		await authContext.internalAdapter.updateUser(userId, { emailVerified: true });
	}
}

async function createCredentialUser(params: {
	email: string;
	language?: AppLanguage;
	name: string;
	password: string;
	username?: string;
}) {
	const authContext = await auth.$context;
	const passwordHash = await hashPassword(params.password);
	const createdUser = await authContext.internalAdapter.createUser({
		email: normalizeEmail(params.email),
		emailVerified: false,
		language: params.language,
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

async function createProviderUser(account: ProviderAccountPayload, language?: AppLanguage) {
	const authContext = await auth.$context;
	const createdUser = await authContext.internalAdapter.createUser({
		email: normalizeEmail(account.email),
		emailVerified: true,
		image: account.image,
		language,
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

export async function consumeAuthChallenge(
	token: string,
	language?: string | null,
): Promise<ChallengeConsumeResult> {
	const t = await getFlowT(language);
	const challenge = await readChallenge(token);
	if (!challenge) {
		return {
			kind: "error",
			message: t("serverAuth.flow.errors.challengeExpired"),
			title: t("serverAuth.flow.titles.challengeExpired"),
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
			message: t("serverAuth.flow.errors.accountAlreadyLinked"),
			title: t("serverAuth.flow.titles.accountLinkFailed"),
		};
	}

	if (!existing?.linkedAccount) {
		const user = await authContext.internalAdapter.findUserById(challenge.userId);
		if (!user) {
			await deleteChallenge(token);
			return {
				callbackURL: challenge.callbackURL,
				kind: "error",
				message: t("serverAuth.flow.errors.userRemoved"),
				title: t("serverAuth.flow.titles.accountLinkFailed"),
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
	const result = await createResultTokenForUser(challenge.userId, language);

	if (result.status !== "signed_in") {
		return {
			callbackURL: challenge.callbackURL,
			kind: "error",
			message: result.message,
			title: t("serverAuth.flow.titles.accountLinkFailed"),
		};
	}

	return {
		callbackURL: challenge.callbackURL,
		kind: "link_provider_completed",
		message: t("serverAuth.flow.messages.googleLinked"),
		redirectToken: result.resultToken.token,
		title: t("serverAuth.flow.titles.accountLinked"),
	};
}

export async function completePasswordSetup(
	token: string,
	newPassword: string,
	language?: string | null,
): Promise<CompletePasswordSetupResult> {
	const t = await getFlowT(language);
	const challenge = await readChallenge(token);
	if (!challenge || challenge.type !== "setup_password") {
		return {
			kind: "error",
			message: t("serverAuth.flow.errors.passwordSetupExpired"),
			title: t("serverAuth.flow.titles.challengeExpired"),
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
			message: t("serverAuth.flow.errors.passwordTooShort", { min: minPasswordLength }),
			renderForm: true,
			title: t("serverAuth.flow.titles.passwordTooShort"),
		};
	}

	if (newPassword.length > maxPasswordLength) {
		return {
			callbackURL: challenge.callbackURL,
			email: challenge.email,
			kind: "error",
			message: t("serverAuth.flow.errors.passwordTooLong", { max: maxPasswordLength }),
			renderForm: true,
			title: t("serverAuth.flow.titles.passwordTooLong"),
		};
	}

	const user = await authContext.internalAdapter.findUserById(challenge.userId);
	if (!user) {
		await deleteChallenge(token);
		return {
			callbackURL: challenge.callbackURL,
			kind: "error",
			message: t("serverAuth.flow.errors.userRemoved"),
			title: t("serverAuth.flow.titles.passwordSaveFailed"),
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
			message: t("serverAuth.flow.messages.passwordSavedSignIn"),
			title: t("serverAuth.flow.titles.passwordSaved"),
		};
	}

	const result = await createResultTokenForUser(challenge.userId, language);
	if (result.status !== "signed_in") {
		return {
			callbackURL: challenge.callbackURL,
			kind: "error",
			message: result.message,
			title: t("serverAuth.flow.titles.signInFailed"),
		};
	}

	return {
		callbackURL: challenge.callbackURL,
		kind: "success",
		message: t("serverAuth.flow.messages.passwordSaved"),
		redirectToken: result.resultToken.token,
		title: t("serverAuth.flow.titles.passwordSaved"),
	};
}

export function getPublicBaseURL(): string {
	return env.APP_PUBLIC_URL.replace(/\/+$/, "");
}

export async function resolveEmailSignIn(params: {
	callbackURL?: string;
	email: string;
	language?: AppLanguage;
	password: string;
	publicBaseURL: string;
}): Promise<AuthFlowResult> {
	const t = await getFlowT(params.language);
	const normalizedEmail = normalizeEmail(params.email);
	const existingUser = await findUserByEmail(normalizedEmail);
	if (!existingUser) {
		return createTerminalErrorResult("user_not_found", t("errors.auth.codes.user_not_found"));
	}

	const credentialAccount = findCredentialAccount(existingUser.accounts);
	if (!credentialAccount?.password) {
		return await sendSetupPasswordChallenge(existingUser.user.id, normalizedEmail, {
			callbackURL: params.callbackURL,
			language: params.language,
			publicBaseURL: params.publicBaseURL,
		});
	}

	const isValidPassword = await verifyPassword(credentialAccount.password, params.password);
	if (!isValidPassword) {
		return createTerminalErrorResult(
			"invalid_email_or_password",
			t("errors.auth.codes.invalid_email_or_password"),
		);
	}

	return await createResultTokenForUser(existingUser.user.id, params.language);
}

export async function resolveEmailSignUp(params: {
	callbackURL?: string;
	email: string;
	language?: AppLanguage;
	name: string;
	password: string;
	publicBaseURL: string;
	username?: string;
}): Promise<AuthFlowResult> {
	const t = await getFlowT(params.language);
	const normalizedEmail = normalizeEmail(params.email);
	const existingUser = await findUserByEmail(normalizedEmail);
	if (existingUser) {
		if (findCredentialAccount(existingUser.accounts)) {
			return createTerminalErrorResult("email_already_exists", t("errors.auth.codes.email_already_exists"));
		}

		return await sendSetupPasswordChallenge(existingUser.user.id, normalizedEmail, {
			callbackURL: params.callbackURL,
			language: params.language,
			publicBaseURL: params.publicBaseURL,
		});
	}

	try {
		const createdUser = await createCredentialUser({
			email: normalizedEmail,
			language: params.language,
			name: params.name,
			password: params.password,
			username: params.username,
		});
		return await createResultTokenForUser(createdUser.id, params.language);
	} catch (error) {
		Logger.warn("Auth", "Failed to create credential user during app auth sign-up", error);
		return createTerminalErrorResult("email_already_exists", t("errors.auth.codes.email_already_exists"));
	}
}

export async function resolveGoogleContinue(
	account: ProviderAccountPayload,
	requestContext: AppAuthRequestContext,
): Promise<AuthFlowResult> {
	const t = await getFlowT(requestContext.language);
	if (!account.email) {
		return createTerminalErrorResult("email_not_found", t("errors.auth.codes.email_not_found"));
	}

	if (!account.emailVerified) {
		return createTerminalErrorResult("email_not_verified", t("errors.auth.codes.email_not_verified"));
	}

	const authContext = await auth.$context;
	const existing = await authContext.internalAdapter.findOAuthUser(
		account.email,
		account.accountId,
		account.providerId,
	);
	if (existing?.linkedAccount) {
		return await createResultTokenForUser(existing.user.id, requestContext.language);
	}

	if (existing?.user) {
		return await sendLinkProviderChallenge(existing.user.id, account, requestContext);
	}

	try {
		const createdUser = await createProviderUser(account, requestContext.language);
		return await createResultTokenForUser(createdUser.id, requestContext.language);
	} catch (error) {
		Logger.warn("Auth", "Failed to create provider user during app auth continue flow", error);

		const fallbackUser = await findUserByEmail(account.email);
		if (fallbackUser?.user) {
			return await sendLinkProviderChallenge(fallbackUser.user.id, account, requestContext);
		}

		return createTerminalErrorResult("oauth_failed", t("errors.auth.codes.oauth_failed"));
	}
}

export async function resolvePasswordHelp(params: {
	callbackURL?: string;
	email: string;
	language?: AppLanguage;
	publicBaseURL: string;
}): Promise<AuthFlowResult> {
	const t = await getFlowT(params.language);
	const normalizedEmail = normalizeEmail(params.email);
	const existingUser = await findUserByEmail(normalizedEmail);
	if (!existingUser) {
		return createTerminalErrorResult("user_not_found", t("errors.auth.codes.user_not_found"));
	}

	return await sendSetupPasswordChallenge(existingUser.user.id, normalizedEmail, {
		callbackURL: params.callbackURL,
		language: params.language,
		publicBaseURL: params.publicBaseURL,
	});
}

export async function resolveAuthenticatedGoogleLink(
	userId: string,
	account: ProviderAccountPayload,
	language?: AppLanguage,
): Promise<AuthFlowResult> {
	const t = await getFlowT(language);
	const authContext = await auth.$context;
	const existing = await authContext.internalAdapter.findOAuthUser(
		account.email,
		account.accountId,
		account.providerId,
	);
	if (existing?.linkedAccount && existing.user.id !== userId) {
		return createTerminalErrorResult(
			"account_already_linked_to_different_user",
			t("errors.auth.codes.account_already_linked_to_different_user"),
		);
	}

	const accounts = await authContext.internalAdapter.findAccounts(userId);
	const currentProviderAccount = accounts.find((entry) => entry.providerId === account.providerId);
	if (currentProviderAccount && currentProviderAccount.accountId !== account.accountId) {
		return createTerminalErrorResult(
			"provider_requires_manual_link",
			t("errors.auth.codes.provider_requires_manual_link"),
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

	return await createResultTokenForUser(userId, language);
}

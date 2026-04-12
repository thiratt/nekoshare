import { customSessionClient, oneTimeTokenClient, usernameClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import type { Auth, BetterAuthClientOptions, InferSessionFromClient, InferUserFromClient } from "better-auth";

import { config } from "./config";
import { AppError, createInternalError, ErrorCategory, ErrorSource, failure, type Result, success } from "./errors";
import { xfetch, type XFetchOptions } from "./xfetch";

export const authClient = createAuthClient({
	baseURL: config.apiBaseUrl,
	basePath: "/auth",
	plugins: [usernameClient(), customSessionClient<InferSession>(), oneTimeTokenClient()],
});

export interface SessionUser extends InferUserFromClient<BetterAuthClientOptions> {
	deviceId: string;
	displayUsername?: string | null;
	username?: string | null;
}

export interface InferSession extends Auth {
	user: SessionUser;
	session: InferSessionFromClient<BetterAuthClientOptions>;
}

export interface SessionResult {
	session: InferSession | null;
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
	promise: Promise<InferSession | null> | null;
	lastFetchTime: number;
}

export interface AuthActionError {
	code?: string;
	message: string;
	status: number;
	cause?: unknown;
}

export interface AuthActionResult<T> {
	data: T | null;
	error: AuthActionError | null;
}

export interface AuthUserAccount {
	accountId: string;
	createdAt: string;
	id: string;
	providerId: string;
	scopes: string[];
	updatedAt: string;
	userId: string;
}

export interface UpdateUsernameInput {
	displayUsername?: string | null;
	username: string;
}

export interface ChangePasswordInput {
	currentPassword: string;
	newPassword: string;
	revokeOtherSessions?: boolean;
}

export interface SetPasswordInput {
	newPassword: string;
}

export interface ChangeEmailInput {
	callbackURL?: string;
	newEmail: string;
}

export interface DeleteUserInput {
	password?: string;
}

export interface UploadUserAvatarResult {
	contentType: string;
	imageUrl: string;
	objectKey: string;
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

function normalizeAuthActionKey(error: AuthActionError | null | undefined): string {
	if (!error) {
		return "";
	}

	return `${error.code ?? ""} ${error.message}`.trim().toLowerCase();
}

function createAuthActionError(params: {
	code?: string;
	message?: string;
	status?: number;
	cause?: unknown;
}): AuthActionError {
	return {
		code: params.code,
		message: params.message?.trim() || "เกิดข้อผิดพลาดที่ไม่คาดคิด",
		status: params.status ?? 0,
		cause: params.cause,
	};
}

async function parseResponseBody<T>(response: Response): Promise<T | null> {
	const text = await response.text().catch(() => "");
	if (!text) {
		return null;
	}

	try {
		return JSON.parse(text) as T;
	} catch {
		return null;
	}
}

async function requestAuthAction<T>(path: string, options: XFetchOptions = {}): Promise<AuthActionResult<T>> {
	try {
		const response = await xfetch(path, options);
		const payload = await parseResponseBody<T | { code?: string; error?: string; message?: string }>(response);

		if (!response.ok) {
			const errorPayload =
				payload && typeof payload === "object" && !Array.isArray(payload)
					? (payload as { code?: string; error?: string; message?: string })
					: null;

			return {
				data: null,
				error: createAuthActionError({
					code: errorPayload?.code ?? errorPayload?.error,
					message: errorPayload?.message ?? response.statusText,
					status: response.status,
					cause: errorPayload ?? payload,
				}),
			};
		}

		return {
			data: payload as T | null,
			error: null,
		};
	} catch (error) {
		return {
			data: null,
			error: createAuthActionError({
				message: error instanceof Error ? error.message : "เกิดข้อผิดพลาดที่ไม่คาดคิด",
				cause: error,
			}),
		};
	}
}

function getAccountStatusCallbackUrl(kind: "email-change" = "email-change"): string {
	return new URL(`/auth/account/status?kind=${encodeURIComponent(kind)}`, `${config.apiBaseUrl}/`).toString();
}

export function getAccountActionErrorMessage(
	error: AuthActionError | null | undefined,
	fallback = "ไม่สามารถดำเนินการได้ กรุณาลองอีกครั้ง",
): string {
	const key = normalizeAuthActionKey(error);

	if (!key) {
		return fallback;
	}

	if (key.includes("username_is_already_taken") || (key.includes("username") && key.includes("already"))) {
		return "ชื่อผู้ใช้งานนี้ถูกใช้งานแล้ว กรุณาเลือกชื่ออื่น";
	}

	if (key.includes("username_too_short")) {
		return "ชื่อผู้ใช้งานต้องมีอย่างน้อย 3 ตัวอักษร";
	}

	if (key.includes("username_too_long")) {
		return "ชื่อผู้ใช้งานต้องมีความยาวไม่เกิน 16 ตัวอักษร";
	}

	if (key.includes("invalid_username")) {
		return "ชื่อผู้ใช้งานใช้ได้เฉพาะตัวอักษรภาษาอังกฤษ ตัวเลข จุด และขีดล่าง";
	}

	if (key.includes("email is the same")) {
		return "อีเมลใหม่นี้ตรงกับอีเมลปัจจุบันของคุณ";
	}

	if (key.includes("verification email isn't enabled") || key.includes("verification email isn")) {
		return "ระบบส่งอีเมลยืนยันยังไม่พร้อมใช้งานในขณะนี้";
	}

	if (key.includes("change email is disabled")) {
		return "ระบบเปลี่ยนอีเมลยังไม่พร้อมใช้งานในขณะนี้";
	}

	if (key.includes("user already exists") || key.includes("another email") || key.includes("email_already_exists")) {
		return "อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่น";
	}

	if (key.includes("credential_account_not_found")) {
		return "บัญชีนี้ยังไม่ได้ตั้งรหัสผ่าน กรุณาตั้งรหัสผ่านใหม่ก่อน";
	}

	if (key.includes("password_already_set")) {
		return "บัญชีนี้มีรหัสผ่านอยู่แล้ว กรุณาใช้การเปลี่ยนรหัสผ่านแทน";
	}

	if (key.includes("password_too_short")) {
		return "รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร";
	}

	if (key.includes("password_too_long")) {
		return "รหัสผ่านต้องมีความยาวไม่เกิน 16 ตัวอักษร";
	}

	if (key.includes("invalid_password")) {
		return "รหัสผ่านไม่ถูกต้อง";
	}

	if (key.includes("session_expired")) {
		return "เซสชันของคุณหมดอายุ กรุณาเข้าสู่ระบบใหม่แล้วลองอีกครั้ง";
	}

	if (key.includes("unauthorized") || key.includes("failed_to_get_session") || key.includes("user_not_found")) {
		return "เซสชันของคุณไม่พร้อมใช้งาน กรุณาเข้าสู่ระบบใหม่แล้วลองอีกครั้ง";
	}

	if (key.includes("avatar_storage_not_configured")) {
		return "ยังไม่ได้ตั้งค่า storage สำหรับรูปโปรไฟล์บนเซิร์ฟเวอร์";
	}

	if (key.includes("avatar_too_large")) {
		return "รูปโปรไฟล์ต้องมีขนาดไม่เกิน 5 MB";
	}

	if (key.includes("unsupported_avatar_type")) {
		return "รองรับเฉพาะไฟล์ WebP, PNG หรือ JPEG";
	}

	return error?.message || fallback;
}

export async function updateUserProfile(input: {
	image?: string | null;
	name?: string;
}): Promise<AuthActionResult<Record<string, unknown>>> {
	return await requestAuthAction<Record<string, unknown>>("auth/update-user", {
		body: input,
		method: "POST",
		operation: "Update user profile",
	});
}

export async function uploadUserAvatar(
	image: Blob,
	options: { signal?: AbortSignal } = {},
): Promise<AuthActionResult<UploadUserAvatarResult>> {
	return await requestAuthAction<UploadUserAvatarResult>("auth/account/avatar", {
		body: image,
		headers: {
			"Content-Type": image.type || "application/octet-stream",
		},
		method: "POST",
		operation: "Upload user avatar",
		signal: options.signal,
		timeout: 60_000,
	});
}

export async function updateUsername(input: UpdateUsernameInput): Promise<AuthActionResult<Record<string, unknown>>> {
	return await requestAuthAction<Record<string, unknown>>("auth/update-user", {
		body: {
			displayUsername: input.displayUsername ?? input.username,
			username: input.username,
		},
		method: "POST",
		operation: "Update username",
	});
}

export async function listUserAccounts(): Promise<AuthActionResult<AuthUserAccount[]>> {
	return await requestAuthAction<AuthUserAccount[]>("auth/list-accounts", {
		method: "GET",
		operation: "List linked accounts",
	});
}

export async function changePassword(input: ChangePasswordInput): Promise<AuthActionResult<Record<string, unknown>>> {
	return await requestAuthAction<Record<string, unknown>>("auth/change-password", {
		body: input,
		method: "POST",
		operation: "Change password",
	});
}

export async function setPassword(input: SetPasswordInput): Promise<AuthActionResult<Record<string, unknown>>> {
	return await requestAuthAction<Record<string, unknown>>("auth/account/set-password", {
		body: input,
		method: "POST",
		operation: "Set password",
	});
}

export async function changeEmail(input: ChangeEmailInput): Promise<AuthActionResult<Record<string, unknown>>> {
	return await requestAuthAction<Record<string, unknown>>("auth/change-email", {
		body: {
			callbackURL: input.callbackURL ?? getAccountStatusCallbackUrl("email-change"),
			newEmail: input.newEmail,
		},
		method: "POST",
		operation: "Change email",
	});
}

export async function deleteUser(input: DeleteUserInput = {}): Promise<AuthActionResult<Record<string, unknown>>> {
	return await requestAuthAction<Record<string, unknown>>("auth/delete-user", {
		body: input,
		method: "POST",
		operation: "Delete user",
	});
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
				session: data as InferSession,
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
				return data as InferSession;
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
		username: session?.user?.displayUsername ?? session?.user?.username ?? session?.user?.name ?? null,
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

export async function getSession(): Promise<InferSession | null> {
	const result = await getCachedSession();
	if (result.status === "error") {
		return null;
	}
	return result.data.session;
}

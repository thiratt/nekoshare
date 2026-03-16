interface AuthErrorLike {
	code?: string | null;
	error?: string | null;
	message?: string | null;
	status?: number;
	statusText?: string | null;
}

const AUTH_ERROR_MESSAGES: Record<string, string> = {
	access_denied: "คุณยกเลิกการเข้าสู่ระบบด้วย Google",
	account_already_linked_to_different_user: "บัญชี Google นี้ถูกเชื่อมกับผู้ใช้อื่นอยู่แล้ว",
	account_not_linked: "บัญชี Google นี้ยังไม่ได้เชื่อมกับบัญชีของคุณ",
	email_already_exists: "อีเมลนี้ถูกใช้งานแล้ว",
	email_doesnt_match: "อีเมลของบัญชี Google ไม่ตรงกับบัญชีที่ต้องการเชื่อม",
	email_not_found: "ไม่พบอีเมลจากบัญชี Google นี้",
	failed_to_create_user: "ไม่สามารถสร้างบัญชีผู้ใช้ได้ในขณะนี้",
	invalid_code: "เซสชันการเข้าสู่ระบบหมดอายุหรือไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง",
	invalid_credentials: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
	invalid_email: "รูปแบบอีเมลไม่ถูกต้อง",
	invalid_email_or_password: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
	invalid_password: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
	invalid_token: "เซสชันการเข้าสู่ระบบหมดอายุ กรุณาลองใหม่อีกครั้ง",
	no_callback_url: "ไม่พบปลายทางหลังเข้าสู่ระบบ กรุณาลองใหม่อีกครั้ง",
	no_code: "ไม่ได้รับรหัสยืนยันจาก Google กรุณาลองใหม่อีกครั้ง",
	oauth_failed: "ไม่สามารถดำเนินการเข้าสู่ระบบด้วย Google ได้ในขณะนี้",
	oauth_provider_not_found: "ไม่พบผู้ให้บริการเข้าสู่ระบบที่ต้องการ",
	password_too_short: "รหัสผ่านสั้นเกินไป",
	session_not_found: "เซสชันการเข้าสู่ระบบหมดอายุ กรุณาลองใหม่อีกครั้ง",
	signup_disabled: "ไม่พบบัญชีนี้ กรุณาสมัครสมาชิกก่อน",
	state_mismatch: "เซสชันการเข้าสู่ระบบหมดอายุ กรุณาลองใหม่อีกครั้ง",
	token_expired: "เซสชันการเข้าสู่ระบบหมดอายุ กรุณาลองใหม่อีกครั้ง",
	unable_to_create_user: "ไม่สามารถสร้างบัญชีผู้ใช้ได้ในขณะนี้",
	unable_to_get_user_info: "ไม่สามารถดึงข้อมูลผู้ใช้จาก Google ได้ในขณะนี้",
	unable_to_link_account: "ไม่สามารถเชื่อมบัญชี Google ได้ในขณะนี้",
	user_already_exists: "บัญชีนี้มีอยู่แล้ว กรุณาใช้อีเมลหรือชื่อผู้ใช้อื่น",
	user_already_exists_use_another_email: "อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่น",
	user_not_found: "ไม่พบบัญชีผู้ใช้นี้",
	username_already_exists: "ชื่อผู้ใช้นี้ถูกใช้งานแล้ว",
	username_is_taken: "ชื่อผู้ใช้นี้ถูกใช้งานแล้ว",
};

const AUTH_ERROR_PATTERNS: Array<[RegExp, string]> = [
	[/access denied|cancelled|canceled/i, AUTH_ERROR_MESSAGES.access_denied],
	[/account not linked/i, AUTH_ERROR_MESSAGES.account_not_linked],
	[/different emails? not allowed|email(?:.*)doesn.?t match/i, AUTH_ERROR_MESSAGES.email_doesnt_match],
	[/state mismatch|request expired|invalid state/i, AUTH_ERROR_MESSAGES.state_mismatch],
	[/invalid (email|password|credential)|wrong password/i, AUTH_ERROR_MESSAGES.invalid_credentials],
	[/user already exists|another email/i, AUTH_ERROR_MESSAGES.user_already_exists_use_another_email],
	[/username.*taken|username.*exists/i, AUTH_ERROR_MESSAGES.username_is_taken],
	[/failed to create user|unable to create user/i, AUTH_ERROR_MESSAGES.failed_to_create_user],
	[/failed to get user info|unable to get user info/i, AUTH_ERROR_MESSAGES.unable_to_get_user_info],
];

function normalizeAuthErrorKey(value: string): string {
	return value
		.trim()
		.toLowerCase()
		.replace(/['"]/g, "")
		.replace(/[^a-z0-9]+/g, "_")
		.replace(/^_+|_+$/g, "");
}

function lookupAuthErrorMessage(value: string): string | null {
	const normalized = normalizeAuthErrorKey(value);
	if (!normalized) {
		return null;
	}

	const direct = AUTH_ERROR_MESSAGES[normalized];
	if (direct) {
		return direct;
	}

	for (const [pattern, message] of AUTH_ERROR_PATTERNS) {
		if (pattern.test(value)) {
			return message;
		}
	}

	return null;
}

export function getThaiAuthErrorMessage(error: unknown, fallback: string): string {
	if (typeof error === "string") {
		return lookupAuthErrorMessage(error) ?? error;
	}

	if (error && typeof error === "object") {
		const authError = error as AuthErrorLike;
		const candidates = [authError.code, authError.error, authError.message];

		for (const candidate of candidates) {
			if (typeof candidate !== "string" || candidate.trim().length === 0) {
				continue;
			}

			return lookupAuthErrorMessage(candidate) ?? candidate;
		}

		if (typeof authError.status === "number") {
			if (authError.status === 401) {
				return AUTH_ERROR_MESSAGES.invalid_credentials;
			}

			if (authError.status === 409) {
				return AUTH_ERROR_MESSAGES.user_already_exists_use_another_email;
			}
		}
	}

	if (error instanceof Error && error.message.trim().length > 0) {
		return lookupAuthErrorMessage(error.message) ?? error.message;
	}

	return fallback;
}

export function getThaiAuthCallbackErrorMessage(search: string, fallback: string): string | null {
	const params = new URLSearchParams(search);
	const error = params.get("error");
	const errorDescription = params.get("error_description");

	if (!error && !errorDescription) {
		return null;
	}

	return getThaiAuthErrorMessage(errorDescription ?? error ?? "", fallback);
}

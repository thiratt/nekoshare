import type { AppTFunction, AppTranslationKey } from "./resources";

interface AuthErrorLike {
  body?: {
    code?: string | null;
    error?: string | null;
    message?: string | null;
  };
  code?: string | null;
  error?: string | null;
  message?: string | null;
  status?: number;
  statusText?: string | null;
}

const AUTH_ERROR_KEY_MAP = {
  access_denied: "errors.auth.codes.access_denied",
  account_already_linked_to_different_user: "errors.auth.codes.account_already_linked_to_different_user",
  account_not_linked: "errors.auth.codes.account_not_linked",
  desktop_callback_missing: "errors.auth.codes.desktop_callback_missing",
  email_already_exists: "errors.auth.codes.email_already_exists",
  email_delivery_unavailable: "errors.auth.codes.email_delivery_unavailable",
  email_doesnt_match: "errors.auth.codes.email_doesnt_match",
  email_not_found: "errors.auth.codes.email_not_found",
  email_not_verified: "errors.auth.codes.email_not_verified",
  failed_to_create_user: "errors.auth.codes.failed_to_create_user",
  google_login_cancelled: "errors.auth.codes.google_login_cancelled",
  invalid_code: "errors.auth.codes.invalid_code",
  invalid_credentials: "errors.auth.codes.invalid_credentials",
  invalid_email: "errors.auth.codes.invalid_email",
  invalid_email_or_password: "errors.auth.codes.invalid_email_or_password",
  invalid_or_expired_challenge: "errors.auth.codes.invalid_or_expired_challenge",
  invalid_password: "errors.auth.codes.invalid_password",
  invalid_token: "errors.auth.codes.invalid_token",
  link_provider_email_sent: "errors.auth.codes.link_provider_email_sent",
  no_callback_url: "errors.auth.codes.no_callback_url",
  no_code: "errors.auth.codes.no_code",
  oauth_failed: "errors.auth.codes.oauth_failed",
  oauth_provider_not_found: "errors.auth.codes.oauth_provider_not_found",
  password_too_short: "errors.auth.codes.password_too_short",
  provider_requires_manual_link: "errors.auth.codes.provider_requires_manual_link",
  session_not_found: "errors.auth.codes.session_not_found",
  setup_password_email_sent: "errors.auth.codes.setup_password_email_sent",
  signup_disabled: "errors.auth.codes.signup_disabled",
  state_mismatch: "errors.auth.codes.state_mismatch",
  token_expired: "errors.auth.codes.token_expired",
  unable_to_create_user: "errors.auth.codes.unable_to_create_user",
  unable_to_get_user_info: "errors.auth.codes.unable_to_get_user_info",
  unable_to_link_account: "errors.auth.codes.unable_to_link_account",
  user_already_exists: "errors.auth.codes.user_already_exists",
  user_already_exists_use_another_email: "errors.auth.codes.user_already_exists_use_another_email",
  user_not_found: "errors.auth.codes.user_not_found",
  username_already_exists: "errors.auth.codes.username_already_exists",
  username_is_taken: "errors.auth.codes.username_is_taken",
} as const satisfies Record<string, AppTranslationKey>;

const AUTH_ERROR_KEY_LOOKUP: Partial<Record<string, AppTranslationKey>> = AUTH_ERROR_KEY_MAP;

const AUTH_ERROR_PATTERNS: Array<[RegExp, AppTranslationKey]> = [
  [/access denied|cancelled|canceled/i, AUTH_ERROR_KEY_MAP.access_denied],
  [/google login was cancelled/i, AUTH_ERROR_KEY_MAP.google_login_cancelled],
  [/account not linked/i, AUTH_ERROR_KEY_MAP.account_not_linked],
  [/different emails? not allowed|email(?:.*)doesn.?t match/i, AUTH_ERROR_KEY_MAP.email_doesnt_match],
  [/state mismatch|request expired|invalid state/i, AUTH_ERROR_KEY_MAP.state_mismatch],
  [/invalid (email|password|credential)|wrong password/i, AUTH_ERROR_KEY_MAP.invalid_credentials],
  [/user already exists|another email/i, AUTH_ERROR_KEY_MAP.user_already_exists_use_another_email],
  [/username.*taken|username.*exists/i, AUTH_ERROR_KEY_MAP.username_is_taken],
  [/failed to create user|unable to create user/i, AUTH_ERROR_KEY_MAP.failed_to_create_user],
  [/failed to get user info|unable to get user info/i, AUTH_ERROR_KEY_MAP.unable_to_get_user_info],
];

function normalizeErrorKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function lookupAuthErrorKey(value: string): AppTranslationKey | null {
  const normalized = normalizeErrorKey(value);
  if (!normalized) {
    return null;
  }

  const direct = AUTH_ERROR_KEY_LOOKUP[normalized];
  if (direct) {
    return direct;
  }

  for (const [pattern, key] of AUTH_ERROR_PATTERNS) {
    if (pattern.test(value)) {
      return key;
    }
  }

  return null;
}

export function getAuthErrorMessage(t: AppTFunction, error: unknown, fallbackKey: AppTranslationKey): string {
  if (typeof error === "string") {
    const key = lookupAuthErrorKey(error);
    return key ? t(key) : error;
  }

  if (error && typeof error === "object") {
    const authError = error as AuthErrorLike;
    const candidates = [
      authError.code,
      authError.error,
      authError.message,
      authError.body?.code,
      authError.body?.error,
      authError.body?.message,
    ];

    for (const candidate of candidates) {
      if (typeof candidate !== "string" || candidate.trim().length === 0) {
        continue;
      }

      const key = lookupAuthErrorKey(candidate);
      return key ? t(key) : candidate;
    }

    if (typeof authError.status === "number") {
      if (authError.status === 401) {
        return t(AUTH_ERROR_KEY_MAP.invalid_credentials);
      }

      if (authError.status === 409) {
        return t(AUTH_ERROR_KEY_MAP.user_already_exists_use_another_email);
      }
    }
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    const key = lookupAuthErrorKey(error.message);
    return key ? t(key) : error.message;
  }

  return t(fallbackKey);
}

export function getAuthCallbackErrorMessage(
  t: AppTFunction,
  search: string,
  fallbackKey: AppTranslationKey,
): string | null {
  const params = new URLSearchParams(search);
  const error = params.get("error");
  const errorDescription = params.get("error_description");

  if (!error && !errorDescription) {
    return null;
  }

  return getAuthErrorMessage(t, errorDescription ?? error ?? "", fallbackKey);
}

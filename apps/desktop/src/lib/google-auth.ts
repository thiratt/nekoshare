import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";

import { config } from "@workspace/app-ui/lib/config";
import { xfetch } from "@workspace/app-ui/lib/xfetch";

export type GoogleAuthFlow = "login" | "signup";

const GOOGLE_AUTH_CANCELLED_MESSAGE = "Google login was cancelled.";

interface AuthErrorResponse {
  code?: string;
  error?: string;
  message?: string;
}

interface GoogleAuthCallbackServerStartResponse {
  serverId: string;
  callbackUrl: string;
}

interface GoogleAuthCallbackPayload {
  token?: string;
  error?: string;
}

const GOOGLE_AUTH_ERROR_MESSAGES: Record<string, string> = {
  access_denied: "Google login was cancelled.",
  account_not_linked: "This Google account is not linked to your account.",
  invalid_token: "Login session expired. Please try again.",
  oauth_failed: "Google login failed. Please try again.",
  session_not_found: "Login session expired. Please try again.",
  signup_disabled: "Account not found. Please sign up first.",
  token_expired: "Login session expired. Please try again.",
  unable_to_create_user: "Account not found. Please sign up first.",
};

let cancelPendingGoogleAuth: (() => Promise<void>) | null = null;

export class GoogleAuthCancelledError extends Error {
  constructor(message: string = GOOGLE_AUTH_CANCELLED_MESSAGE) {
    super(message);
    this.name = "GoogleAuthCancelledError";
  }
}

function createDesktopGoogleStartUrl(
  flow: GoogleAuthFlow,
  attempt: string,
  callbackUrl: string,
): string {
  const startUrl = new URL("/auth/desktop/google/start", config.apiBaseUrl);
  startUrl.searchParams.set("flow", flow);
  startUrl.searchParams.set("attempt", attempt);
  startUrl.searchParams.set("callback_url", callbackUrl);
  return startUrl.toString();
}

function toGoogleAuthErrorMessage(error: string): string {
  const mapped = GOOGLE_AUTH_ERROR_MESSAGES[error];
  if (mapped) {
    return mapped;
  }

  const normalized = error.replace(/[_-]+/g, " ").trim();
  if (!normalized) {
    return GOOGLE_AUTH_ERROR_MESSAGES.oauth_failed;
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function toError(error: unknown, fallback: string): Error {
  if (error instanceof Error) {
    return error;
  }

  if (typeof error === "string" && error.trim().length > 0) {
    return new Error(error.trim());
  }

  return new Error(fallback);
}

export function isGoogleAuthCancelledError(
  error: unknown,
): error is GoogleAuthCancelledError {
  return error instanceof GoogleAuthCancelledError;
}

async function readAuthErrorMessage(response: Response): Promise<string> {
  const payload = (await response
    .json()
    .catch(() => null)) as AuthErrorResponse | null;

  if (payload?.code) {
    return toGoogleAuthErrorMessage(payload.code);
  }

  if (payload?.error) {
    return toGoogleAuthErrorMessage(payload.error);
  }

  if (
    typeof payload?.message === "string" &&
    payload.message.trim().length > 0
  ) {
    return payload.message;
  }

  return `Request failed with status ${response.status}`;
}

async function startGoogleAuthCallbackServer(
  attempt: string,
): Promise<GoogleAuthCallbackServerStartResponse> {
  const payload = await invoke<unknown>(
    "ns_start_google_auth_callback_server",
    { attempt },
  );
  if (!payload || typeof payload !== "object") {
    throw new Error("Failed to start the Google login callback listener.");
  }

  const serverId =
    "serverId" in payload && typeof payload.serverId === "string"
      ? payload.serverId
      : null;
  const callbackUrl =
    "callbackUrl" in payload && typeof payload.callbackUrl === "string"
      ? payload.callbackUrl
      : null;

  if (!serverId || !callbackUrl) {
    throw new Error(
      "Failed to read the Google login callback listener address.",
    );
  }

  return { serverId, callbackUrl };
}

async function waitForGoogleAuthCallback(
  serverId: string,
): Promise<GoogleAuthCallbackPayload> {
  const payload = await invoke<unknown>("ns_wait_google_auth_callback_server", {
    serverId,
  });

  if (!payload || typeof payload !== "object") {
    throw new Error("Google login callback payload is invalid.");
  }

  const token =
    "token" in payload && typeof payload.token === "string"
      ? payload.token
      : undefined;
  const error =
    "error" in payload && typeof payload.error === "string"
      ? payload.error
      : undefined;

  if (!token && !error) {
    throw new Error("Google login callback payload is incomplete.");
  }

  return { token, error };
}

async function cancelGoogleAuthCallbackServer(serverId: string): Promise<void> {
  await invoke("ns_cancel_google_auth_callback_server", { serverId });
}

export async function cancelPendingGoogleAuthSignIn(): Promise<void> {
  const cancel = cancelPendingGoogleAuth;
  if (!cancel) {
    return;
  }

  cancelPendingGoogleAuth = null;
  await cancel();
}

async function exchangeGoogleOneTimeToken(token: string): Promise<void> {
  const response = await xfetch("auth/one-time-token/verify", {
    method: "POST",
    body: { token },
    operation: "Google sign-in token exchange",
  });

  if (!response.ok) {
    throw new Error(await readAuthErrorMessage(response));
  }

  await response.json().catch(() => null);
}

export async function signInWithGoogle(flow: GoogleAuthFlow): Promise<void> {
  const attempt = crypto.randomUUID();
  const { serverId, callbackUrl } =
    await startGoogleAuthCallbackServer(attempt);
  const redirectUrl = createDesktopGoogleStartUrl(flow, attempt, callbackUrl);
  const callbackPromise = waitForGoogleAuthCallback(serverId).catch((error) => {
    const normalizedError = toError(
      error,
      "Google login failed. Please try again.",
    );

    if (normalizedError.message === GOOGLE_AUTH_CANCELLED_MESSAGE) {
      throw new GoogleAuthCancelledError();
    }

    throw normalizedError;
  });

  cancelPendingGoogleAuth = async () => {
    await cancelGoogleAuthCallbackServer(serverId).catch(() => undefined);
  };

  try {
    await openUrl(redirectUrl);
    const callbackPayload = await callbackPromise;

    if (callbackPayload.error) {
      throw new Error(toGoogleAuthErrorMessage(callbackPayload.error));
    }

    if (!callbackPayload.token) {
      throw new Error("Google login failed. Please try again.");
    }

    await exchangeGoogleOneTimeToken(callbackPayload.token);
  } catch (error) {
    if (!isGoogleAuthCancelledError(error)) {
      await cancelGoogleAuthCallbackServer(serverId).catch(() => undefined);
    }

    throw isGoogleAuthCancelledError(error)
      ? error
      : toError(error, "Google login failed. Please try again.");
  } finally {
    cancelPendingGoogleAuth = null;
  }
}

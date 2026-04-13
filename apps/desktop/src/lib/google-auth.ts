import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";

import { config } from "@workspace/app-ui/lib/config";

import { exchangeDesktopAuthResultToken } from "@/lib/app-auth";
import type { AppLanguage } from "@workspace/i18n/core";

export type GoogleAuthFlow = "login" | "signup";

export type GoogleAuthResult =
  | {
      code: string;
      message: string;
      status: "action_required";
    }
  | {
      status: "signed_in";
    };

const ACTION_REQUIRED_CODES = new Set([
  "link_provider_email_sent",
  "setup_password_email_sent",
]);
const GOOGLE_AUTH_CANCELLED_MESSAGE = "google_login_cancelled";
const GOOGLE_AUTH_ERROR_FALLBACK = "oauth_failed";

interface GoogleAuthCallbackServerStartResponse {
  callbackUrl: string;
  serverId: string;
}

interface GoogleAuthCallbackPayload {
  error?: string;
  token?: string;
}

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
  language?: AppLanguage,
): string {
  const startUrl = new URL(
    "/auth/app/provider/google/desktop/start",
    config.apiBaseUrl,
  );
  startUrl.searchParams.set("attempt", attempt);
  startUrl.searchParams.set("callback_url", callbackUrl);
  startUrl.searchParams.set("flow", flow);
  if (language) {
    startUrl.searchParams.set("lng", language);
  }
  return startUrl.toString();
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

async function startGoogleAuthCallbackServer(
  attempt: string,
): Promise<GoogleAuthCallbackServerStartResponse> {
  const payload = await invoke<unknown>(
    "ns_start_google_auth_callback_server",
    { attempt },
  );
  if (!payload || typeof payload !== "object") {
    throw new Error("desktop_callback_missing");
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
    throw new Error("desktop_callback_missing");
  }

  return { callbackUrl, serverId };
}

async function waitForGoogleAuthCallback(
  serverId: string,
): Promise<GoogleAuthCallbackPayload> {
  const payload = await invoke<unknown>("ns_wait_google_auth_callback_server", {
    serverId,
  });
  if (!payload || typeof payload !== "object") {
    throw new Error("oauth_failed");
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
    throw new Error("oauth_failed");
  }

  return { error, token };
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

export async function signInWithGoogle(
  flow: GoogleAuthFlow,
  language?: AppLanguage,
): Promise<GoogleAuthResult> {
  const attempt = crypto.randomUUID();
  const { callbackUrl, serverId } =
    await startGoogleAuthCallbackServer(attempt);
  const redirectUrl = createDesktopGoogleStartUrl(
    flow,
    attempt,
    callbackUrl,
    language,
  );
  const callbackPromise = waitForGoogleAuthCallback(serverId).catch((error) => {
    const normalizedError = toError(error, GOOGLE_AUTH_ERROR_FALLBACK);
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
      if (ACTION_REQUIRED_CODES.has(callbackPayload.error)) {
        return {
          code: callbackPayload.error,
          message: callbackPayload.error,
          status: "action_required",
        };
      }

      throw new Error(callbackPayload.error);
    }

    if (!callbackPayload.token) {
      throw new Error(GOOGLE_AUTH_ERROR_FALLBACK);
    }

    await exchangeDesktopAuthResultToken(callbackPayload.token);
    return { status: "signed_in" };
  } catch (error) {
    if (!isGoogleAuthCancelledError(error)) {
      await cancelGoogleAuthCallbackServer(serverId).catch(() => undefined);
    }

    throw isGoogleAuthCancelledError(error)
      ? error
      : toError(error, GOOGLE_AUTH_ERROR_FALLBACK);
  } finally {
    cancelPendingGoogleAuth = null;
  }
}

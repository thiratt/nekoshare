import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";

import { config } from "@workspace/app-ui/lib/config";
import { xfetch } from "@workspace/app-ui/lib/xfetch";

import { getThaiAuthErrorMessage } from "@/lib/auth-error";

export type GoogleAuthFlow = "login" | "signup";

const GOOGLE_AUTH_CANCELLED_MESSAGE = "คุณยกเลิกการเข้าสู่ระบบด้วย Google";
const GOOGLE_AUTH_ERROR_FALLBACK =
  "ไม่สามารถดำเนินการเข้าสู่ระบบด้วย Google ได้ในขณะนี้";

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
  const mapped = getThaiAuthErrorMessage(error, GOOGLE_AUTH_ERROR_FALLBACK);
  if (mapped !== error) {
    return mapped;
  }

  return /^[a-z0-9_-]+$/i.test(error) ? GOOGLE_AUTH_ERROR_FALLBACK : mapped;
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
    return getThaiAuthErrorMessage(payload.message, GOOGLE_AUTH_ERROR_FALLBACK);
  }

  return `คำขอไม่สำเร็จ (สถานะ ${response.status})`;
}

async function startGoogleAuthCallbackServer(
  attempt: string,
): Promise<GoogleAuthCallbackServerStartResponse> {
  const payload = await invoke<unknown>(
    "ns_start_google_auth_callback_server",
    { attempt },
  );
  if (!payload || typeof payload !== "object") {
    throw new Error("ไม่สามารถเริ่มตัวรับ callback สำหรับ Google ได้");
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
    throw new Error("ไม่สามารถอ่านที่อยู่ callback สำหรับ Google ได้");
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
    throw new Error("ข้อมูล callback จาก Google ไม่ถูกต้อง");
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
    throw new Error("ข้อมูล callback จาก Google ไม่ครบถ้วน");
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
      throw new Error(toGoogleAuthErrorMessage(callbackPayload.error));
    }

    if (!callbackPayload.token) {
      throw new Error(GOOGLE_AUTH_ERROR_FALLBACK);
    }

    await exchangeGoogleOneTimeToken(callbackPayload.token);
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

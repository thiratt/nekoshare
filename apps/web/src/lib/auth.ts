import {
  authClient,
  getCachedSession,
  invalidateSessionCache,
} from "@workspace/app-ui/lib/auth";

import type { AppLanguage } from "@workspace/i18n/core";

function resolveCallbackUrl(path: string): string {
  if (typeof window === "undefined") {
    return path;
  }

  return new URL(path, window.location.origin).toString();
}

export async function signInWithGoogle(
  errorPath: string = "/login",
  requestSignUp: boolean = false,
  language?: AppLanguage,
): Promise<void> {
  const result = await authClient.signIn.social({
    provider: "google",
    callbackURL: resolveCallbackUrl("/home"),
    errorCallbackURL: resolveCallbackUrl(errorPath),
    requestSignUp,
    additionalData: language ? { language } : undefined,
  });

  if (result.error) {
    throw result.error;
  }
}

export { authClient, getCachedSession, invalidateSessionCache };

import {
  authClient,
  getCachedSession,
  invalidateSessionCache,
} from "@workspace/app-ui/lib/auth";

import { getThaiAuthErrorMessage } from "@/lib/auth-error";

function resolveCallbackUrl(path: string): string {
  if (typeof window === "undefined") {
    return path;
  }

  return new URL(path, window.location.origin).toString();
}

export async function signInWithGoogle(
  errorPath: string = "/login",
  requestSignUp: boolean = false,
): Promise<void> {
  const result = await authClient.signIn.social({
    provider: "google",
    callbackURL: resolveCallbackUrl("/home"),
    errorCallbackURL: resolveCallbackUrl(errorPath),
    requestSignUp,
  });

  if (result.error) {
    throw new Error(
      getThaiAuthErrorMessage(
        result.error,
        "ไม่สามารถเริ่มเข้าสู่ระบบด้วย Google ได้ในขณะนี้",
      ),
    );
  }
}

export { authClient, getCachedSession, invalidateSessionCache };

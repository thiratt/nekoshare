import { createFileRoute, Link, useRouter } from "@tanstack/react-router";

import { useToast } from "@workspace/ui/hooks/use-toast";

import { LoginCard } from "@workspace/app-ui/components/login-card";
import { useNekoShare } from "@workspace/app-ui/context/nekoshare";
import type { TLoginSchema } from "@workspace/app-ui/types/schema";

import { useGoogleAuthProgress } from "@/context/GoogleAuthProgressContext";
import {
  continueDesktopEmailSignIn,
  exchangeDesktopAuthResultToken,
} from "@/lib/app-auth";
import { invalidateSessionCache } from "@/lib/auth";
import { bootstrapAuthenticatedDesktopSession } from "@/lib/auth-bootstrap";
import {
  isGoogleAuthCancelledError,
  signInWithGoogle,
} from "@/lib/google-auth";
import { getAuthErrorMessage } from "@workspace/i18n/messages";
import { useAppI18n } from "@workspace/i18n/react";

export const Route = createFileRoute("/(auth)/login")({
  component: RouteComponent,
});

function RouteComponent() {
  const router = useRouter();
  const { setGlobalLoading } = useNekoShare();
  const { toast } = useToast();
  const { language, t } = useAppI18n();
  const { hideGoogleAuthProgress, showGoogleAuthProgress } =
    useGoogleAuthProgress();

  const onGoogle = async () => {
    try {
      showGoogleAuthProgress();
      const result = await signInWithGoogle("login", language);
      if (result.status === "action_required") {
        toast.info(getAuthErrorMessage(t, result.code, "errors.auth.fallbacks.googleActionRequired"));
        return;
      }

      invalidateSessionCache();
      setGlobalLoading(true);
      await bootstrapAuthenticatedDesktopSession();
      await router.navigate({ to: "/home" });
    } catch (error) {
      if (isGoogleAuthCancelledError(error)) {
        return;
      }

      toast.error(
        getAuthErrorMessage(t, error, "errors.auth.fallbacks.googleLogin"),
      );
    } finally {
      hideGoogleAuthProgress();
      setGlobalLoading(false);
    }
  };

  const onSubmit = async (data: TLoginSchema) => {
    try {
      const result = await continueDesktopEmailSignIn({
        email: data.identifier,
        language,
        password: data.password,
      });

      if (result.status === "action_required") {
        toast.info(getAuthErrorMessage(t, result.code, "errors.auth.fallbacks.googleActionRequired"));
        return;
      }

      if (result.status === "terminal_error") {
        toast.error(
          getAuthErrorMessage(t, result.code, "errors.auth.fallbacks.login"),
        );
        return;
      }

      await exchangeDesktopAuthResultToken(result.resultToken.token);
      invalidateSessionCache();
      setGlobalLoading(true);
      await bootstrapAuthenticatedDesktopSession();
      await router.navigate({ to: "/home" });
    } catch (error) {
      toast.error(
        getAuthErrorMessage(t, error, "errors.auth.fallbacks.login"),
      );
    } finally {
      setGlobalLoading(false);
    }
  };

  return (
    <LoginCard linkComponent={Link} onGoogle={onGoogle} onSubmit={onSubmit} />
  );
}

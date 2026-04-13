import { createFileRoute, Link, useRouter } from "@tanstack/react-router";

import { useToast } from "@workspace/ui/hooks/use-toast";

import { SignupCard } from "@workspace/app-ui/components/signup-card";
import { useNekoShare } from "@workspace/app-ui/context/nekoshare";
import type { TSignupSchema } from "@workspace/app-ui/types/schema";

import { useGoogleAuthProgress } from "@/context/GoogleAuthProgressContext";
import {
  continueDesktopEmailSignUp,
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

export const Route = createFileRoute("/(auth)/signup")({
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
      const result = await signInWithGoogle("signup", language);
      if (result.status === "action_required") {
        toast.info(getAuthErrorMessage(t, result.code, "errors.auth.fallbacks.googleActionRequired"));
        return;
      }

      invalidateSessionCache();
      setGlobalLoading(true);
      await bootstrapAuthenticatedDesktopSession();
      await router.navigate({ to: "/home", replace: true });
    } catch (error) {
      if (isGoogleAuthCancelledError(error)) {
        return;
      }

      toast.error(
        getAuthErrorMessage(t, error, "errors.auth.fallbacks.googleSignup"),
      );
    } finally {
      hideGoogleAuthProgress();
      setGlobalLoading(false);
    }
  };

  const onSubmit = async (data: TSignupSchema) => {
    try {
      const result = await continueDesktopEmailSignUp({
        email: data.email,
        language,
        name: data.username,
        password: data.password,
      });

      if (result.status === "action_required") {
        toast.info(getAuthErrorMessage(t, result.code, "errors.auth.fallbacks.googleActionRequired"));
        return;
      }

      if (result.status === "terminal_error") {
        toast.error(
          getAuthErrorMessage(t, result.code, "errors.auth.fallbacks.signup"),
        );
        return;
      }

      await exchangeDesktopAuthResultToken(result.resultToken.token);
      invalidateSessionCache();
      setGlobalLoading(true);
      await bootstrapAuthenticatedDesktopSession();
      await router.navigate({ to: "/home", replace: true });
    } catch (error) {
      toast.error(
        getAuthErrorMessage(t, error, "errors.auth.fallbacks.signup"),
      );
    } finally {
      setGlobalLoading(false);
    }
  };

  return (
    <SignupCard linkComponent={Link} onSubmit={onSubmit} onGoogle={onGoogle} />
  );
}

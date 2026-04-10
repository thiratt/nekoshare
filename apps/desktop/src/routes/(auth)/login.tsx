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
import { getThaiAuthErrorMessage } from "@/lib/auth-error";
import {
  isGoogleAuthCancelledError,
  signInWithGoogle,
} from "@/lib/google-auth";

export const Route = createFileRoute("/(auth)/login")({
  component: RouteComponent,
});

function RouteComponent() {
  const router = useRouter();
  const { setGlobalLoading } = useNekoShare();
  const { toast } = useToast();
  const { hideGoogleAuthProgress, showGoogleAuthProgress } =
    useGoogleAuthProgress();

  const onGoogle = async () => {
    try {
      showGoogleAuthProgress();
      const result = await signInWithGoogle("login");
      if (result.status === "action_required") {
        toast.info(result.message);
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
        getThaiAuthErrorMessage(
          error,
          "ไม่สามารถเข้าสู่ระบบด้วย Google ได้ในขณะนี้",
        ),
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
        password: data.password,
      });

      if (result.status === "action_required") {
        toast.info(getThaiAuthErrorMessage(result.code, result.message));
        return;
      }

      if (result.status === "terminal_error") {
        toast.error(
          getThaiAuthErrorMessage(
            result.code,
            "ไม่สามารถเข้าสู่ระบบได้ในขณะนี้ โปรดลองอีกครั้งในภายหลัง",
          ),
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
        getThaiAuthErrorMessage(
          error,
          "ไม่สามารถเข้าสู่ระบบได้ในขณะนี้ โปรดลองอีกครั้งในภายหลัง",
        ),
      );
    } finally {
      setGlobalLoading(false);
    }
  };

  return (
    <LoginCard linkComponent={Link} onGoogle={onGoogle} onSubmit={onSubmit} />
  );
}

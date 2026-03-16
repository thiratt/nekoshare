import { createFileRoute, Link, useRouter } from "@tanstack/react-router";

import { useToast } from "@workspace/ui/hooks/use-toast";

import { LoginCard } from "@workspace/app-ui/components/login-card";
import { useNekoShare } from "@workspace/app-ui/context/nekoshare";
import type { TLoginSchema } from "@workspace/app-ui/types/schema";

import { useGoogleAuthProgress } from "@/context/GoogleAuthProgressContext";
import { authClient, invalidateSessionCache } from "@/lib/auth";
import { bootstrapAuthenticatedDesktopSession } from "@/lib/auth-bootstrap";
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
      await signInWithGoogle("login");
      invalidateSessionCache();
      setGlobalLoading(true);
      await bootstrapAuthenticatedDesktopSession();
      await router.navigate({ to: "/home" });
    } catch (error) {
      if (isGoogleAuthCancelledError(error)) {
        return;
      }

      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to sign in with Google right now.",
      );
    } finally {
      hideGoogleAuthProgress();
      setGlobalLoading(false);
    }
  };

  const onSubmit = async (data: TLoginSchema) => {
    try {
      const result = await authClient.signIn.email({
        email: data.identifier,
        password: data.password,
      });

      if (result.error) {
        throw new Error(
          result.error.code +
            ": -" +
            result.error.message +
            result.error.status +
            " " +
            result.error.statusText,
        );
      }

      invalidateSessionCache();
      setGlobalLoading(true);
      await bootstrapAuthenticatedDesktopSession();
      await router.navigate({ to: "/home" });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "ไม่สามารถเข้าสู่ระบบได้ในขณะนี้ โปรดลองอีกครั้งในภายหลัง",
      );
    } finally {
      setGlobalLoading(false);
    }
  };

  return (
    <LoginCard linkComponent={Link} onGoogle={onGoogle} onSubmit={onSubmit} />
  );
}

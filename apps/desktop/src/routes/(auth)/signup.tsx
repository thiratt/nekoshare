import { createFileRoute, Link, useRouter } from "@tanstack/react-router";

import { useToast } from "@workspace/ui/hooks/use-toast";

import { SignupCard } from "@workspace/app-ui/components/signup-card";
import { useNekoShare } from "@workspace/app-ui/context/nekoshare";
import type { TSignupSchema } from "@workspace/app-ui/types/schema";

import { useGoogleAuthProgress } from "@/context/GoogleAuthProgressContext";
import { authClient, invalidateSessionCache } from "@/lib/auth";
import { bootstrapAuthenticatedDesktopSession } from "@/lib/auth-bootstrap";
import {
  isGoogleAuthCancelledError,
  signInWithGoogle,
} from "@/lib/google-auth";

export const Route = createFileRoute("/(auth)/signup")({
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
      await signInWithGoogle("signup");
      invalidateSessionCache();
      setGlobalLoading(true);
      await bootstrapAuthenticatedDesktopSession();
      await router.navigate({ to: "/home", replace: true });
    } catch (error) {
      if (isGoogleAuthCancelledError(error)) {
        return;
      }

      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to sign up with Google right now.",
      );
    } finally {
      hideGoogleAuthProgress();
      setGlobalLoading(false);
    }
  };

  const onSubmit = async (data: TSignupSchema) => {
    try {
      const result = await authClient.signUp.email({
        email: data.email,
        password: data.password,
        name: data.username,
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
      await router.navigate({ to: "/home", replace: true });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to sign up right now. Please try again later.",
      );
    } finally {
      setGlobalLoading(false);
    }
  };

  return (
    <SignupCard linkComponent={Link} onSubmit={onSubmit} onGoogle={onGoogle} />
  );
}

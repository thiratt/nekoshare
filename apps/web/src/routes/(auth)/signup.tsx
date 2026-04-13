import { useEffect, useRef, useState } from "react";

import {
  createFileRoute,
  Link,
  useLocation,
  useRouter,
} from "@tanstack/react-router";

import { useToast } from "@workspace/ui/hooks/use-toast";

import { SignupCard } from "@workspace/app-ui/components/signup-card";
import { useNekoShare } from "@workspace/app-ui/context/nekoshare";
import type { TSignupSchema } from "@workspace/app-ui/types/schema";

import {
  authClient,
  invalidateSessionCache,
  signInWithGoogle,
} from "@/lib/auth";
import { getAuthCallbackErrorMessage, getAuthErrorMessage } from "@workspace/i18n/messages";
import { useAppI18n } from "@workspace/i18n/react";

export const Route = createFileRoute("/(auth)/signup")({
  component: RouteComponent,
});

function RouteComponent() {
  const location = useLocation();
  const router = useRouter();
  const { setGlobalLoading } = useNekoShare();
  const { toast } = useToast();
  const { language, t } = useAppI18n();
  const [socialErrorMessage, setSocialErrorMessage] = useState<string | null>(
    null,
  );
  const handledCallbackSearchRef = useRef<string>("");

  useEffect(() => {
    const currentSearch = window.location.search;
    if (!currentSearch || handledCallbackSearchRef.current === currentSearch) {
      return;
    }

    const errorMessage = getAuthCallbackErrorMessage(
      t,
      currentSearch,
      "auth.callbacks.googleSignUpFailed",
    );
    if (!errorMessage) {
      return;
    }

    handledCallbackSearchRef.current = currentSearch;
    setSocialErrorMessage(errorMessage);
    toast.error(errorMessage);

    const params = new URLSearchParams(currentSearch);
    params.delete("error");
    params.delete("error_description");

    const nextSearch = params.toString();
    const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`;
    window.history.replaceState({}, "", nextUrl);
  }, [location, t, toast]);

  const onGoogle = async () => {
    try {
      setSocialErrorMessage(null);
      setGlobalLoading(true);
      await signInWithGoogle("/signup", true, language);
    } catch (error) {
      toast.error(
        getAuthErrorMessage(t, error, "errors.auth.fallbacks.googleSignup"),
      );
      setGlobalLoading(false);
    }
  };

  const onSubmit = async (data: TSignupSchema) => {
    setSocialErrorMessage(null);

    const { error } = await authClient.signUp.email({
      email: data.email,
      language,
      password: data.password,
      name: data.username,
      username: data.username,
    } as Parameters<typeof authClient.signUp.email>[0] & { language: typeof language });

    if (error) {
      console.error("Signup failed:", error);
      toast.error(getAuthErrorMessage(t, error, "errors.auth.fallbacks.signup"));
      return;
    }

    invalidateSessionCache();
    setGlobalLoading(true);

    try {
      await router.navigate({ to: "/home", replace: true });
    } catch (navigateError) {
      console.error("Navigation after signup failed:", navigateError);
      setGlobalLoading(false);
    }
  };

  return (
    <SignupCard
      linkComponent={Link}
      onGoogle={onGoogle}
      onSubmit={onSubmit}
      socialErrorMessage={socialErrorMessage}
    />
  );
}

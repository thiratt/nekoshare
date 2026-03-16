import { useEffect, useRef, useState } from "react";

import {
  createFileRoute,
  Link,
  useLocation,
  useRouter,
} from "@tanstack/react-router";

import { useToast } from "@workspace/ui/hooks/use-toast";

import { LoginCard } from "@workspace/app-ui/components/login-card";
import { useNekoShare } from "@workspace/app-ui/context/nekoshare";
import type { TLoginSchema } from "@workspace/app-ui/types/schema";

import {
  authClient,
  invalidateSessionCache,
  signInWithGoogle,
} from "@/lib/auth";
import {
  getThaiAuthCallbackErrorMessage,
  getThaiAuthErrorMessage,
} from "@/lib/auth-error";

export const Route = createFileRoute("/(auth)/login")({
  component: RouteComponent,
});

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GOOGLE_LOGIN_ERROR_FALLBACK =
  "ไม่สามารถเข้าสู่ระบบด้วย Google ได้ในขณะนี้";
const LOGIN_ERROR_FALLBACK =
  "ไม่สามารถเข้าสู่ระบบได้ กรุณาตรวจสอบข้อมูลแล้วลองใหม่อีกครั้ง";

function RouteComponent() {
  const location = useLocation();
  const router = useRouter();
  const { setGlobalLoading } = useNekoShare();
  const { toast } = useToast();
  const [socialErrorMessage, setSocialErrorMessage] = useState<string | null>(
    null,
  );
  const handledCallbackSearchRef = useRef<string>("");

  useEffect(() => {
    const currentSearch = window.location.search;
    if (!currentSearch || handledCallbackSearchRef.current === currentSearch) {
      return;
    }

    const errorMessage = getThaiAuthCallbackErrorMessage(
      currentSearch,
      GOOGLE_LOGIN_ERROR_FALLBACK,
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
  }, [location, toast]);

  const onGoogle = async () => {
    try {
      setSocialErrorMessage(null);
      setGlobalLoading(true);
      await signInWithGoogle("/login");
    } catch (error) {
      toast.error(getThaiAuthErrorMessage(error, GOOGLE_LOGIN_ERROR_FALLBACK));
      setGlobalLoading(false);
    }
  };

  const onSubmit = async (data: TLoginSchema) => {
    const isEmail = EMAIL_REGEX.test(data.identifier);

    try {
      setSocialErrorMessage(null);
      const result = isEmail
        ? await authClient.signIn.email({
            email: data.identifier,
            password: data.password,
          })
        : await authClient.signIn.username({
            username: data.identifier,
            password: data.password,
          });

      if (result.error) {
        throw result.error;
      }

      invalidateSessionCache();
      setGlobalLoading(true);
      await router.navigate({ to: "/home" });
    } catch (error) {
      console.error("Login failed:", error);
      toast.error(getThaiAuthErrorMessage(error, LOGIN_ERROR_FALLBACK));
      setGlobalLoading(false);
    }
  };

  return (
    <LoginCard
      linkComponent={Link}
      onGoogle={onGoogle}
      onSubmit={onSubmit}
      socialErrorMessage={socialErrorMessage}
    />
  );
}

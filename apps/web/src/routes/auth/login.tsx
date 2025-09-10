import { toast } from "sonner";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";

import { authClient, getErrorMessage } from "@/libs/auth";
import { getSafeHomeRedirect } from "@/libs/path";

import { LoginCard } from "@workspace/app-ui/components/auth/login";
import type { TLoginSchema } from "@workspace/app-ui/types/schema";

type RedirectSearch = {
  redirect: string;
};

export const Route = createFileRoute("/auth/login")({
  component: AuthLoginComponent,
  validateSearch: (search: Record<string, unknown>): RedirectSearch => {
    return {
      redirect: typeof search.redirect === "string" ? search.redirect : "/home",
    };
  },
});

const data = {
  identifier: "thiratcha",
  password: "12345678",
};

function AuthLoginComponent() {
  const router = useRouter();
  const search = Route.useSearch();
  const redirectTo = getSafeHomeRedirect(search.redirect);

  const onGoogle = async () => {
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: `${window.location.origin}${redirectTo}`,
      });
    } catch (err) {
      console.error("Google Sign-In failed:", err);
      toast.error("ไม่สามารถเข้าสู่ระบบด้วย Google ได้");
    }
  };

  const onSubmit = async (data: TLoginSchema) => {
    const { identifier, password } = data;

    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier.trim());

    try {
      if (isEmail) {
        const res = await authClient.signIn.email({
          email: identifier.trim(),
          password,
        });
        if (res?.error) throw new Error(res.error.code);
      } else {
        const res = await authClient.signIn.username({
          username: identifier.trim(),
          password,
        });
        console.log(res);
        if (res?.error) throw new Error(res.error.code);
      }

      router.navigate({ to: redirectTo });
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(getErrorMessage(error.message) || "เข้าสู่ระบบล้มเหลว");
        console.error("Login failed:", error.message);
      } else {
        console.error("Unknown error:", error);
      }
    }
  };

  return (
    <LoginCard
      data={data}
      linkComponent={Link}
      onGoogle={onGoogle}
      onSubmit={onSubmit}
    />
  );
}

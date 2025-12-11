import { createFileRoute, Link, useRouter } from "@tanstack/react-router";

import { useToast } from "@workspace/ui/hooks/use-toast";
import { LoginCard } from "@workspace/app-ui/components/login-card";
import { authClient, invalidateSessionCache } from "@workspace/app-ui/lib/auth";
import type { TLoginSchema } from "@workspace/app-ui/types/schema";
import { registerDevice } from "@/lib/device";

export const Route = createFileRoute("/(auth)/login")({
  component: RouteComponent,
});

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function RouteComponent() {
  const router = useRouter();
  const { toast } = useToast();

  const onGoogle = async () => {
    try {
      console.log("GOOGLE");
    } catch (error) {
      console.error("Error in onGoogle:", error);
    }
  };

  const onSubmit = async (data: TLoginSchema) => {
    const isEmail = EMAIL_REGEX.test(data.identifier);

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
      console.error("Login error:", result.error.message);
      toast.error(result.error.message ?? "เข้าสู่ระบบไม่สำเร็จ");
      throw new Error(result.error.message ?? "เข้าสู่ระบบไม่สำเร็จ");
    }

    invalidateSessionCache();

    try {
      await registerDevice();
      await router.navigate({ to: "/home" });
    } catch (error) {
      toast.error(
        "Failed to register device: " +
          (error instanceof Error ? error.message : String(error)),
      );
      console.error("Failed to register device:", error);
    }
  };

  return (
    <LoginCard linkComponent={Link} onGoogle={onGoogle} onSubmit={onSubmit} />
  );
}

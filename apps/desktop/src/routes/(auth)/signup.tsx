import { createFileRoute, Link, useRouter } from "@tanstack/react-router";

import { useToast } from "@workspace/ui/hooks/use-toast";

import { SignupCard } from "@workspace/app-ui/components/signup-card";
import { useNekoShare } from "@workspace/app-ui/context/nekoshare";
import type { TSignupSchema } from "@workspace/app-ui/types/schema";

import { authClient, invalidateSessionCache } from "@/lib/auth";
import { registerDevice } from "@/lib/device";
import { syncMasterKeyForDevice } from "@/lib/security/master-key-sync";

export const Route = createFileRoute("/(auth)/signup")({
  component: RouteComponent,
});

function RouteComponent() {
  const router = useRouter();
  const { setGlobalLoading } = useNekoShare();
  const { toast } = useToast();

  const onSubmit = async (data: TSignupSchema) => {
    const { error } = await authClient.signUp.email({
      email: data.email,
      password: data.password,
      name: data.username,
      username: data.username,
    });

    if (error) {
      toast.error(error.message ?? "สมัครสมาชิกไม่สำเร็จ");
      console.error("Signup error:", error);
      return;
    }
    invalidateSessionCache();

    try {
      setGlobalLoading(true);
      const registration = await registerDevice();
      await syncMasterKeyForDevice(registration.device.id);
      await router.navigate({ to: "/home", replace: true });
    } catch (error) {
      console.error("Failed to register device:", error);
    }
  };
  return <SignupCard linkComponent={Link} onSubmit={onSubmit} />;
}

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

  const onGoogle = async () => {
    try {
      console.log("GOOGLE");
    } catch (error) {
      console.error("Error in onGoogle:", error);
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
      const registration = await registerDevice();
      await syncMasterKeyForDevice(registration.device.id);
      await router.navigate({ to: "/home", replace: true });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "ไม่สามารถสมัครสมาชิกได้ในขณะนี้ โปรดลองอีกครั้งในภายหลัง",
      );
    }
  };

  return (
    <SignupCard linkComponent={Link} onSubmit={onSubmit} onGoogle={onGoogle} />
  );
}

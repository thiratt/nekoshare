import { createFileRoute, Link, useRouter } from "@tanstack/react-router";

import { useToast } from "@workspace/ui/hooks/use-toast";

import { LoginCard } from "@workspace/app-ui/components/login-card";
import { useNekoShare } from "@workspace/app-ui/context/nekoshare";
import { authClient, invalidateSessionCache } from "@workspace/app-ui/lib/auth";
import type { TLoginSchema } from "@workspace/app-ui/types/schema";

import { registerDevice } from "@/lib/device";
import { syncMasterKeyForDevice } from "@/lib/security/master-key-sync";

export const Route = createFileRoute("/(auth)/login")({
  component: RouteComponent,
});

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  const onSubmit = async (data: TLoginSchema) => {
    const isEmail = EMAIL_REGEX.test(data.identifier);

    try {
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
      await router.navigate({ to: "/home" });
    } catch {
      toast.error(
        "[500] ไม่สามารถเข้าสู่ระบบได้ เนื่องจากระบบขัดข้อง กรุณาลองใหม่ภายหลัง",
      );
      return;
    }
  };

  return (
    <LoginCard linkComponent={Link} onGoogle={onGoogle} onSubmit={onSubmit} />
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";

import { useToast } from "@workspace/ui/hooks/use-toast";

import { ResetPasswordCard } from "@workspace/app-ui/components/reset-password-card";
import type { TResetPasswordSchema } from "@workspace/app-ui/types/schema";

import { requestDesktopPasswordHelp } from "@/lib/app-auth";
import { getThaiAuthErrorMessage } from "@/lib/auth-error";

export const Route = createFileRoute("/(auth)/reset-pwd")({
  component: RouteComponent,
});

function RouteComponent() {
  const { toast } = useToast();

  const onSubmit = async (data: TResetPasswordSchema) => {
    try {
      const result = await requestDesktopPasswordHelp(data.email);
      if (result.status === "action_required") {
        toast.info(getThaiAuthErrorMessage(result.code, result.message));
        return;
      }

      if (result.status === "terminal_error") {
        toast.error(
          getThaiAuthErrorMessage(
            result.code,
            "ไม่สามารถส่งวิธีตั้งรหัสผ่านได้ในขณะนี้",
          ),
        );
        return;
      }

      toast.info("เราได้ส่งวิธีดำเนินการไปที่อีเมลนี้แล้ว");
    } catch (error) {
      toast.error(
        getThaiAuthErrorMessage(
          error,
          "ไม่สามารถส่งวิธีตั้งรหัสผ่านได้ในขณะนี้",
        ),
      );
    }
  };

  return <ResetPasswordCard linkComponent={Link} onSubmit={onSubmit} />;
}

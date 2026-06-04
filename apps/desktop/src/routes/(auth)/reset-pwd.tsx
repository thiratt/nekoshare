import { createFileRoute } from "@tanstack/react-router";

import { useToast } from "@workspace/ui/hooks/use-toast";

import { ResetPasswordCard } from "@workspace/app-ui/components/reset-password-card";
import type { TResetPasswordSchema } from "@workspace/app-ui/types/schema";

import { requestDesktopPasswordHelp } from "@/lib/app-auth";
import { getAuthErrorMessage } from "@workspace/i18n/messages";
import { useAppI18n } from "@workspace/i18n/react";

export const Route = createFileRoute("/(auth)/reset-pwd")({
  component: RouteComponent,
});

function RouteComponent() {
  const { toast } = useToast();
  const { language, t } = useAppI18n();

  const onSubmit = async (data: TResetPasswordSchema) => {
    try {
      const result = await requestDesktopPasswordHelp(data.email, language);
      if (result.status === "action_required") {
        toast.info(getAuthErrorMessage(t, result.code, "errors.auth.fallbacks.googleActionRequired"));
        return;
      }

      if (result.status === "terminal_error") {
        toast.error(
          getAuthErrorMessage(t, result.code, "errors.auth.fallbacks.passwordHelp"),
        );
        return;
      }

      toast.info(t("errors.auth.codes.setup_password_email_sent"));
    } catch (error) {
      toast.error(
        getAuthErrorMessage(t, error, "errors.auth.fallbacks.passwordHelp"),
      );
    }
  };

  return <ResetPasswordCard onSubmit={onSubmit} />;
}

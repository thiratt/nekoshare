import { createFileRoute } from "@tanstack/react-router";

import { useToast } from "@workspace/ui/hooks/use-toast";

import { ResetPasswordCard } from "@workspace/app-ui/components/reset-password-card";
import type { TResetPasswordSchema } from "@workspace/app-ui/types/schema";

import { useAppI18n } from "@workspace/i18n/react";

export const Route = createFileRoute("/(auth)/reset-pwd")({
  component: RouteComponent,
});

function RouteComponent() {
  const { toast } = useToast();
  const { t } = useAppI18n();

  const onSubmit = async (_data: TResetPasswordSchema) => {
    toast.info(t("auth.callbacks.passwordHelpFailed"));
  };

  return <ResetPasswordCard onSubmit={onSubmit} />;
}

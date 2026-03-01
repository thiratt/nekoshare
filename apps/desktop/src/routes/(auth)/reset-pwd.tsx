import { createFileRoute, Link } from "@tanstack/react-router";

import { useToast } from "@workspace/ui/hooks/use-toast";

import { ResetPasswordCard } from "@workspace/app-ui/components/reset-password-card";
import type { TResetPasswordSchema } from "@workspace/app-ui/types/schema";

export const Route = createFileRoute("/(auth)/reset-pwd")({
	component: RouteComponent,
});

function RouteComponent() {
	const { toast } = useToast();

	const onSubmit = async (_data: TResetPasswordSchema) => {
		toast.info("Forgot password is UI-only for now.");
	};

	return <ResetPasswordCard linkComponent={Link} onSubmit={onSubmit} />;
}

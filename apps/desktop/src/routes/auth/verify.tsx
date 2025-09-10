import { createFileRoute } from "@tanstack/react-router";
import { AuthVerifyForm } from "@workspace/app-ui/components/auth/verify";

export const Route = createFileRoute("/auth/verify")({
  component: RouteComponent,
});

function RouteComponent() {
  return <AuthVerifyForm />;
}

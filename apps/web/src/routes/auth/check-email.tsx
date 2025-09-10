import { createFileRoute, useRouter } from "@tanstack/react-router";
import { AuthCheckEmail } from "@workspace/app-ui/components/auth/check-email";
// import { AuthVerifySuccess } from "@workspace/app-ui/components/auth/verified";

export const Route = createFileRoute("/auth/check-email")({
  component: RouteComponent,
});

function RouteComponent() {
  const router = useRouter();
  return (
    <AuthCheckEmail  />
  );
}

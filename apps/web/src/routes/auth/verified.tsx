import { createFileRoute, useRouter } from "@tanstack/react-router";
import { AuthVerifySuccess } from "@workspace/app-ui/components/auth/verified";

export const Route = createFileRoute("/auth/verified")({
  component: RouteComponent,
});

function RouteComponent() {
  const router = useRouter();

  return (
    <AuthVerifySuccess onContinue={() => router.navigate({ to: "/home" })} />
  );
}

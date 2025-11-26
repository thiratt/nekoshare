import { createFileRoute, Link } from "@tanstack/react-router";

import { SignupCard } from "@workspace/app-ui/components/signup-card";
import type { TSignupSchema } from "@workspace/app-ui/types/schema";

export const Route = createFileRoute("/(auth)/signup")({
  component: RouteComponent,
});

function RouteComponent() {
  const onSubmit = async (data: TSignupSchema) => {
    // TODO: Handle signup logic
    console.log("Signup data:", data);
  };
  return <SignupCard linkComponent={Link} onSubmit={onSubmit} />;
}

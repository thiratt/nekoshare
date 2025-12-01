import { authClient, invalidateSessionCache } from "@/lib/auth";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";

import { SignupCard } from "@workspace/app-ui/components/signup-card";
import type { TSignupSchema } from "@workspace/app-ui/types/schema";

export const Route = createFileRoute("/(auth)/signup")({
  component: RouteComponent,
});

function RouteComponent() {
  const router = useRouter();
  const onSubmit = async (data: TSignupSchema) => {
    const { error } = await authClient.signUp.email({
      email: data.email,
      password: data.password,
      name: data.username,
      username: data.username,
    });

    if (error) {
      console.error("Signup error:", error);
      alert(`Signup failed: ${error.message}`);
      return;
    }
    invalidateSessionCache();

    router.navigate({ to: "/home", replace: true });
  };
  return <SignupCard linkComponent={Link} onSubmit={onSubmit} />;
}

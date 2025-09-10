import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { SignupCard } from "@workspace/app-ui/components/auth/signup";
import type { TLoginSchema } from "@workspace/app-ui/types/schema";

export const Route = createFileRoute("/auth/signup")({
  component: AuthSignupComponent,
});

function AuthSignupComponent() {
  const router = useRouter();

  const onSubmit = async (data: TLoginSchema) => {
    console.log(data);
    router.navigate({ to: "/" });
  };
  return <SignupCard linkComponent={Link} onSubmit={onSubmit} />;
}

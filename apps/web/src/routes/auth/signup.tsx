import { authClient } from "@/libs/auth";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { SignupCard } from "@workspace/app-ui/components/auth/signup";
import type { TSignupSchema } from "@workspace/app-ui/types/schema";

export const Route = createFileRoute("/auth/signup")({
  component: AuthSignupComponent,
});

const data = {
  username: "thiratcha",
  email: "66011212181@msu.ac.th",
  password: "12345678",
};

function AuthSignupComponent() {
  const router = useRouter();

  const onSubmit = async (data: TSignupSchema) => {
    const res = await authClient.signUp.email({
      email: data.email,
      password: data.password,
      name: "",
      username: data.username,
      callbackURL: "http://localhost:3000/auth/verified",
    });

    if (res.error) {
      console.log(res.error);
      return;
    }

    if (!res.data.user.emailVerified) {
      router.navigate({
        to: "/auth/check-email",
        viewTransition: { types: [] },
      });
      return;
    }

    router.navigate({
      to: "/home",
      viewTransition: { types: [] },
    });
  };

  return <SignupCard data={data} linkComponent={Link} onSubmit={onSubmit} />;
}

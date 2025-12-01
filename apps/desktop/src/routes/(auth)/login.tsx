import { createFileRoute, Link, useRouter } from "@tanstack/react-router";

import { LoginCard } from "@workspace/app-ui/components/login-card";
import { authClient } from "@workspace/app-ui/lib/auth";
import type { TLoginSchema } from "@workspace/app-ui/types/schema";
export const Route = createFileRoute("/(auth)/login")({
  component: RouteComponent,
});

function RouteComponent() {
  const router = useRouter();

  const onGoogle = async () => {
    try {
      console.log("GOOGLE");
    } catch (error) {
      console.error("Error in onGoogle:", error);
    }
  };

  const onSubmit = async (data: TLoginSchema) => {
    const { error } = await authClient.signIn.email({
      email: data.identifier,
      password: data.password,
    });

    if (error) {
      console.error("Login error:", error);
      alert(`Login failed: ${error.message}`);
      return;
    }

    router.navigate({ to: "/home", replace: true });
    // const res = await fetch("http://localhost:9988/auth/login", {
    //   method: "POST",
    //   body: JSON.stringify(data),
    // });

    // if (res.ok) {
    //   // const store = await load("store.json");
    //   // const account = await res.json();

    //   // await store.set("account", account);

    //   router.navigate({ to: "/home" });
    // }
  };

  return (
    <LoginCard linkComponent={Link} onGoogle={onGoogle} onSubmit={onSubmit} />
  );
}

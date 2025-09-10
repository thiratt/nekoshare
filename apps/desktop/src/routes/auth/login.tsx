import { useNekoShare } from "@/context/nekoshare";
import { authClient } from "@/libs/auth";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { LoginCard } from "@workspace/app-ui/components/auth/login";
import type { TLoginSchema } from "@workspace/app-ui/types/schema";

export const Route = createFileRoute("/auth/login")({
  component: AuthLoginComponent,
});

function AuthLoginComponent() {
  const router = useRouter();
  const { setGlobalLoading } = useNekoShare();

  // const onGoogle = async () => {
  //   console.log("GOOGLE");
  //   // authClient.signIn.social({ provider: "google" });
  // };

  const onGoogle = async () => {
    try {
      console.log("GOOGLE");
    } catch (error) {
      console.error("Error in onGoogle:", error);
    }
  };

  const onSubmit = async (data: TLoginSchema) => {
    console.log(data);
    setGlobalLoading(true);
    router.navigate({ to: "/home" });
  };

  return (
    <LoginCard linkComponent={Link} onGoogle={onGoogle} onSubmit={onSubmit} />
  );
}

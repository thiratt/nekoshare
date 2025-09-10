import { authClient } from "@/libs/auth";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { AuthVerifyForm } from "@workspace/app-ui/components/auth/verify";

export const Route = createFileRoute("/auth/verify")({
  component: RouteComponent,
});

function RouteComponent() {
  const router = useRouter();

  return (
    <AuthVerifyForm
      onSubmit={async (data) => {
        const res = await authClient.emailOtp.verifyEmail({
          email: "66011212181@msu.ac.th", // required
          otp: data.pin, // required
        });

        console.log(res);
        // router.navigate({ to: "/home", viewTransition: { types: [] } });
      }}
    />
  );
}

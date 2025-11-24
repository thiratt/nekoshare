import { authClient } from "@/lib/auth";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/home")({
  async beforeLoad() {
    const { data: session, error } = await authClient.getSession();
    const isAuthenticated = !!session?.user && !error;
    if (!isAuthenticated) {
      throw redirect({ to: "/login" });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/home"!</div>;
}

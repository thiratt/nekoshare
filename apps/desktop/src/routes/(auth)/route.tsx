import { DesktopTitlebar } from "@/components/navbar";
import { authClient } from "@/lib/auth";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/(auth)")({
  async beforeLoad() {
    const { data: session, error } = await authClient.getSession();
    const isAuthenticated = !!session?.user && !error;
    if (isAuthenticated) {
      throw redirect({ to: "/home" });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="h-screen">
      <DesktopTitlebar onlyControl />
      <Outlet />
    </div>
  );
}

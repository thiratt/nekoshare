import { authMiddleWare } from "@/libs/middleware";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/auth")({
  beforeLoad: async ({ location }) => {
    const session = await authMiddleWare();
    if (location.pathname === "/auth/verified") return;

    if (session) {
      throw redirect({
        to: "/home",
      });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="min-h-svh flex flex-col items-center justify-center">
      <Outlet />
    </div>
  );
}

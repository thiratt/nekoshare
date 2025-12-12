import { DesktopTitlebar } from "@/components/navbar";
import { getCachedSession } from "@/lib/auth";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useNekoShare } from "@workspace/app-ui/context/nekoshare";
import { useEffect } from "react";

export const Route = createFileRoute("/(auth)")({
  async beforeLoad() {
    const { isAuthenticated } = await getCachedSession();
    if (isAuthenticated) {
      throw redirect({ to: "/home" });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { setGlobalLoading } = useNekoShare();

  useEffect(() => {
    setGlobalLoading(false);
  }, []);

  return (
    <div className="h-screen flex flex-col">
      <DesktopTitlebar />
      <div className="flex-1 flex items-center justify-center bg-muted">
        <Outlet />
      </div>
    </div>
  );
}

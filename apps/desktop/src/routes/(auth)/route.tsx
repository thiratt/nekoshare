import { useEffect } from "react";

import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { useNekoShare } from "@workspace/app-ui/context/nekoshare";

import { DesktopTitlebar } from "@/components/navbar";
import { getCachedSession } from "@/lib/auth";

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
  }, [setGlobalLoading]);

  return (
    <div className="h-screen flex flex-col">
      <DesktopTitlebar />
      <div className="flex-1 flex items-center justify-center bg-muted">
        <Outlet />
      </div>
    </div>
  );
}

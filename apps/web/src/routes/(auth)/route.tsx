import { useEffect } from "react";

import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { useNekoShare } from "@workspace/app-ui/context/nekoshare";

import { getCachedSession } from "@/lib/auth";

export const Route = createFileRoute("/(auth)")({
  async beforeLoad() {
    const result = await getCachedSession();

    if (result.status === "success" && result.data.isAuthenticated) {
      throw redirect({ to: "/home" });
    }

    if (result.status === "error") {
      console.error("Failed to fetch session:", result.error.toUserMessage());
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
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      <div className="relative flex flex-1 items-center justify-center px-6 py-10">
        <Outlet />
      </div>
    </div>
  );
}

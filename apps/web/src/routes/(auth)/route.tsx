import { useEffect } from "react";

import { createFileRoute, Link, Outlet, useRouter } from "@tanstack/react-router";

import {
  NekoShareProvider,
  useNekoShare,
} from "@workspace/app-ui/context/nekoshare";

import { AppI18nProvider } from "@workspace/i18n/react";

export const Route = createFileRoute("/(auth)")({
  async beforeLoad() {
    const { redirectAuthenticatedUser } = await import("@/lib/route-auth");

    await redirectAuthenticatedUser();
  },
  component: RouteComponent,
});

function RouteComponent() {
  const router = useRouter();

  return (
    <AppI18nProvider>
      <NekoShareProvider
        router={router}
        linkComponent={Link}
        currentDevice={undefined}
        appMode="web"
      >
        <AuthRouteContent />
      </NekoShareProvider>
    </AppI18nProvider>
  );
}

function AuthRouteContent() {
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

import { createRootRoute, Outlet, useRouter } from "@tanstack/react-router";

import { NekoShareProvider } from "@workspace/app-ui/context/nekoshare";
import { ThemeProvider } from "@workspace/app-ui/providers/theme-provider";

import { ErrorComponent } from "@/components/error";
import { GoogleAnalytics } from "@/components/google-analytics";
import { ThemeHeadSync } from "@/components/theme-head-sync";
import { AppI18nProvider } from "@workspace/i18n/react";

export const Route = createRootRoute({
  component: RouteComponent,
  errorComponent: ErrorComponent,
});

function RouteComponent() {
  const router = useRouter();

  return (
    <ThemeProvider>
      <ThemeHeadSync />
      <GoogleAnalytics />
      <AppI18nProvider>
        <NekoShareProvider
          router={router}
          currentDevice={undefined}
          appMode="web"
        >
          <Outlet />
        </NekoShareProvider>
      </AppI18nProvider>
    </ThemeProvider>
  );
}

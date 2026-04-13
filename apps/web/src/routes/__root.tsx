import { createRootRoute, Outlet, useRouter } from "@tanstack/react-router";

import { NekoShareProvider } from "@workspace/app-ui/context/nekoshare";
import { ThemeProvider } from "@workspace/app-ui/providers/theme-provider";

import { ErrorComponent } from "@/components/error";
import { AppI18nProvider, useAppI18n } from "@workspace/i18n/react";

function PendingScreen() {
  const { t } = useAppI18n();

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <span className="text-sm text-muted-foreground">
        {t("common.loading.app")}
      </span>
    </div>
  );
}

export const Route = createRootRoute({
  component: RouteComponent,
  errorComponent: ErrorComponent,
  pendingComponent: () => (
    <ThemeProvider>
      <AppI18nProvider>
        <PendingScreen />
      </AppI18nProvider>
    </ThemeProvider>
  ),
  pendingMs: 0,
  pendingMinMs: 300,
});

function RouteComponent() {
  const router = useRouter();

  return (
    <ThemeProvider>
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

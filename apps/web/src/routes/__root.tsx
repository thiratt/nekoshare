import { createRootRoute, Outlet } from "@tanstack/react-router";

import { ThemeProvider } from "@workspace/app-ui/providers/theme-provider";

import { ErrorComponent } from "@/components/error";
import { GoogleAnalytics } from "@/components/google-analytics";
import { ThemeHeadSync } from "@/components/theme-head-sync";

export const Route = createRootRoute({
  component: RouteComponent,
  errorComponent: ErrorComponent,
});

function RouteComponent() {
  return (
    <ThemeProvider>
      <ThemeHeadSync />
      <GoogleAnalytics />
      <Outlet />
    </ThemeProvider>
  );
}

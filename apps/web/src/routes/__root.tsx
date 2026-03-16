import { createRootRoute, Outlet, useRouter } from "@tanstack/react-router";

import { NekoShareProvider } from "@workspace/app-ui/context/nekoshare";
import { ThemeProvider } from "@workspace/app-ui/providers/theme-provider";

import { ErrorComponent } from "@/components/error";

export const Route = createRootRoute({
  component: RouteComponent,
  errorComponent: ErrorComponent,
  pendingComponent: () => (
    <ThemeProvider>
      <div className="flex h-screen items-center justify-center bg-background">
        <span className="text-sm text-muted-foreground">
          Loading NekoShare Web...
        </span>
      </div>
    </ThemeProvider>
  ),
  pendingMs: 0,
  pendingMinMs: 300,
});

function RouteComponent() {
  const router = useRouter();

  return (
    <ThemeProvider>
      <NekoShareProvider
        router={router}
        currentDevice={undefined}
        appMode="web"
      >
        <Outlet />
      </NekoShareProvider>
    </ThemeProvider>
  );
}

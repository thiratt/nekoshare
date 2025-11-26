import { Outlet, createRootRoute } from "@tanstack/react-router";
import { NekoShareProvider } from "@workspace/app-ui/context/nekoshare";
import { ThemeProvider } from "@workspace/app-ui/providers/theme-provider";

export const Route = createRootRoute({
  component: () => (
    <ThemeProvider>
      <NekoShareProvider>
        <Outlet />
      </NekoShareProvider>
    </ThemeProvider>
  ),
});

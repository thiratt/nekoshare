import { ThemeProvider } from "@/lib/theme-provider";
import { Outlet, createRootRoute } from "@tanstack/react-router";
import { NekoShareProvider } from "@workspace/app-ui/context/nekoshare";

export const Route = createRootRoute({
  component: () => (
    <NekoShareProvider>
      <ThemeProvider>
        <Outlet />
      </ThemeProvider>
    </NekoShareProvider>
  ),
});

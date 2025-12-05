import { Outlet, createRootRoute, useRouter } from "@tanstack/react-router";
import { NekoShareProvider } from "@workspace/app-ui/context/nekoshare";
import { ThemeProvider } from "@workspace/app-ui/providers/theme-provider";

export const Route = createRootRoute({
  component: () => {
    const router = useRouter();
    return (
      <ThemeProvider>
        <NekoShareProvider router={router}>
          <Outlet />
        </NekoShareProvider>
      </ThemeProvider>
    );
  },
});

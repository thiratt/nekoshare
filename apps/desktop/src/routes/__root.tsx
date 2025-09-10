import { NotAllowedClient } from "@/components/not-allowed";
import { NekoShareProvider } from "@/context/nekoshare";
import { ThemeProvider } from "@/libs/theme-provider";
import { isAllowedUA } from "@/libs/uaCheck";
import { Outlet, createRootRoute } from "@tanstack/react-router";
// import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

export const Route = createRootRoute({
  component: () => {
    if (!isAllowedUA()) {
      return (
        <ThemeProvider>
          <NotAllowedClient />
        </ThemeProvider>
      );
    }

    return (
      <ThemeProvider>
        {/* <NavigationBar /> */}
        <NekoShareProvider>
          <Outlet />
        </NekoShareProvider>
        {/* <TanStackRouterDevtools /> */}
      </ThemeProvider>
    );
  },
});

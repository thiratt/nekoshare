import { Outlet, createRootRoute } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanstackDevtools } from "@tanstack/react-devtools";
import { ThemeProvider } from "@/libs/theme-provider";
import { Toaster } from "@workspace/ui/components/sonner";
import { NekoShareProvider } from "@/context/nekoshare";

export const Route = createRootRoute({
  component: () => (
    <ThemeProvider>
      <NekoShareProvider>
        <Outlet />
      </NekoShareProvider>
      <Toaster richColors position="top-right" />
      <TanstackDevtools
        config={{
          position: "bottom-right",
        }}
        plugins={[
          {
            name: "Tanstack Router",
            render: <TanStackRouterDevtoolsPanel />,
          },
        ]}
      />
    </ThemeProvider>
  ),
});

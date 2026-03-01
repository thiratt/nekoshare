import { createRootRoute, Outlet, useRouter } from "@tanstack/react-router";
import { getCurrentWindow } from "@tauri-apps/api/window";

import { NekoShareProvider } from "@workspace/app-ui/context/nekoshare";
import { ThemeProvider } from "@workspace/app-ui/providers/theme-provider";

import { ErrorComponent } from "@/components/error";
import { NSDesktopProvider } from "@/context/NSDesktopContext";
import { getDeviceInfo } from "@/lib/device";
import { clearMasterKeyForCurrentSession } from "@/lib/security/master-key-sync";

export const Route = createRootRoute({
  component: RouteComponent,
  errorComponent: ErrorComponent,
  loader: async () => {
    const appWindow = getCurrentWindow();

    const [deviceInfo, isMaximized] = await Promise.all([
      getDeviceInfo(),
      appWindow.isMaximized(),
    ]);
    return { deviceInfo, isMaximized };
  },
  pendingComponent: () => (
    <ThemeProvider>
      <div className="flex h-screen bg-background items-center justify-center animate-in fade-in duration-500">
        กำลังโหลดข้อมูลอุปกรณ์...
      </div>
    </ThemeProvider>
  ),
  pendingMs: 0,
  pendingMinMs: 800,
  staleTime: Infinity,
});

function RouteComponent() {
  const router = useRouter();
  const { deviceInfo, isMaximized } = Route.useLoaderData();

  return (
    <ThemeProvider>
      <NekoShareProvider
        router={router}
        currentDevice={deviceInfo}
        onBeforeSignOut={clearMasterKeyForCurrentSession}
      >
        <NSDesktopProvider initialMaximized={isMaximized}>
          <Outlet />
        </NSDesktopProvider>
      </NekoShareProvider>
    </ThemeProvider>
  );
}

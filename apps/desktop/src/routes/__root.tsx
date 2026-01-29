import { useEffect, useState } from "react";

import { createRootRoute, Outlet, useRouter } from "@tanstack/react-router";

import { NekoShareProvider } from "@workspace/app-ui/context/nekoshare";
import { ThemeProvider } from "@workspace/app-ui/providers/theme-provider";
import type { LocalDeviceInfo } from "@workspace/app-ui/types/device";

import { ErrorComponent } from "@/components/error";
import { NSDesktopProvider } from "@/context/NSDesktopContext";
import { getDeviceInfo } from "@/lib/device";

export const Route = createRootRoute({
  component: RouteComponent,
  errorComponent: ErrorComponent,
});

function RouteComponent() {
  const router = useRouter();
  const [deviceInfo, setDeviceInfo] = useState<LocalDeviceInfo | undefined>(
    undefined,
  );

  useEffect(() => {
    const fetchDeviceInfo = async () => {
      const info = await getDeviceInfo();
      setDeviceInfo(info);
    };
    fetchDeviceInfo();
  }, []);

  return (
    <ThemeProvider>
      <NekoShareProvider router={router} currentDevice={deviceInfo}>
        <NSDesktopProvider>
          <Outlet />
        </NSDesktopProvider>
      </NekoShareProvider>
    </ThemeProvider>
  );
}

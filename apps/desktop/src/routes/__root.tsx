import { Outlet, createRootRoute, useRouter } from "@tanstack/react-router";
import { NekoShareProvider } from "@workspace/app-ui/context/nekoshare";
import { ThemeProvider } from "@workspace/app-ui/providers/theme-provider";
import { useEffect, useRef, useState } from "react";

import { getDeviceInfo } from "@/lib/device";
import type { LocalDeviceInfo } from "@workspace/app-ui/types/device";

export const Route = createRootRoute({
  component: () => {
    const router = useRouter();
    const [globalLoading, setGlobalLoading] = useState(true);
    const [deviceInfo, setDeviceInfo] = useState<LocalDeviceInfo | undefined>(
      undefined,
    );
    const hasFetchedRef = useRef(false);

    useEffect(() => {
      if (hasFetchedRef.current) return;
      hasFetchedRef.current = true;

      const fetchDeviceInfo = async () => {
        const info = await getDeviceInfo();
        setDeviceInfo(info);
        setGlobalLoading(false);
      };
      fetchDeviceInfo();
    }, []);

    return (
      <ThemeProvider>
        <NekoShareProvider
          router={router}
          globalLoading={globalLoading}
          currentDevice={deviceInfo}
        >
          <Outlet />
        </NekoShareProvider>
      </ThemeProvider>
    );
  },
});

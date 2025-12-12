import { Outlet, createRootRoute, useRouter } from "@tanstack/react-router";
import { NekoShareProvider } from "@workspace/app-ui/context/nekoshare";
import { ThemeProvider } from "@workspace/app-ui/providers/theme-provider";
import { useEffect, useState } from "react";

import { getDeviceInfo } from "@/lib/device";

export const Route = createRootRoute({
  component: () => {
    const router = useRouter();
    const [deviceId, setDeviceId] = useState<string | undefined>(undefined);

    useEffect(() => {
      getDeviceInfo().then((info) => setDeviceId(info.id));
    }, []);

    return (
      <ThemeProvider>
        <NekoShareProvider router={router} currentDeviceId={deviceId}>
          <Outlet />
        </NekoShareProvider>
      </ThemeProvider>
    );
  },
});

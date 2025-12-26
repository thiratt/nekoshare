import { useMemo } from "react";

import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useLocation,
} from "@tanstack/react-router";
import { LuBell, LuMoon, LuSettings, LuSun } from "react-icons/lu";

import { HomeSidebar } from "@workspace/app-ui/components/home-sidebar";
import { NotificationSidebar } from "@workspace/app-ui/components/notification-sidebar";
import { useNekoShare } from "@workspace/app-ui/context/nekoshare";
import { useNekoSocket } from "@workspace/app-ui/hooks/useNekoSocket";
import { usePacketRouter } from "@workspace/app-ui/hooks/usePacketRouter";
import { useSocketInterval } from "@workspace/app-ui/hooks/useSocketInterval";
import { PacketType } from "@workspace/app-ui/lib/nk-socket/index";
import { useTheme } from "@workspace/app-ui/providers/theme-provider";

import { DesktopTitlebar } from "@/components/navbar";
import { SetupApplicationUI } from "@/components/setup";
import { useAppSetup } from "@/hooks/useAppSetup";
import { getCachedSession } from "@/lib/auth";

export const Route = createFileRoute("/home")({
  async beforeLoad() {
    const { isAuthenticated } = await getCachedSession();
    if (!isAuthenticated) {
      throw redirect({ to: "/login" });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { isSetup, setIsSetup } = useAppSetup();

  const location = useLocation();
  const { globalLoading, notificationStatus, toggleNotification, setMode } =
    useNekoShare();
  const { theme, setTheme } = useTheme();
  const { send } = useNekoSocket();

  const titlebarHelperActions = useMemo(
    () => [
      {
        icon: theme === "dark" ? <LuMoon /> : <LuSun />,
        onClick: () => setTheme(theme === "dark" ? "light" : "dark"),
      },
      {
        icon: <LuBell />,
        onClick: () => toggleNotification(),
        badge: true,
        actived: notificationStatus === "on",
      },
      {
        icon: <LuSettings />,
        onClick: () => setMode("settings"),
      },
    ],
    [notificationStatus, setMode, setTheme, theme, toggleNotification],
  );

  usePacketRouter({
    [PacketType.ERROR_GENERIC]: (message) => {
      console.error("Received ERROR_GENERIC packet:", message);
    },
  });

  useSocketInterval(() => {
    send(PacketType.SYSTEM_HEARTBEAT);
  }, 7000);

  if (globalLoading) return null;

  return (
    <div className="min-h-svh flex flex-col">
      {isSetup ? (
        <>
          <DesktopTitlebar helperActions={titlebarHelperActions} />
          <div className="flex flex-1 divide-x">
            <HomeSidebar
              linkComponent={Link}
              pathname={location.pathname}
              mode="desktop"
              collapseWhenNotificationOpen={notificationStatus === "on"}
            />
            <div className="flex-1 bg-muted p-4">
              <Outlet />
            </div>
            <NotificationSidebar />
          </div>
        </>
      ) : (
        <>
          <DesktopTitlebar />
          <div className="flex flex-1 divide-x items-center justify-center">
            <SetupApplicationUI onSetupComplete={() => setIsSetup(true)} />
          </div>
        </>
      )}
    </div>
  );
}

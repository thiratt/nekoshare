import { useEffect, useMemo, useState } from "react";

import { LuBell, LuMoon, LuSettings, LuSun } from "react-icons/lu";
import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useLocation,
} from "@tanstack/react-router";

import { HomeSidebar } from "@workspace/app-ui/components/home-sidebar";
import { NotificationSidebar } from "@workspace/app-ui/components/notification-sidebar";
import { useNekoShare } from "@workspace/app-ui/context/nekoshare";
import { useTheme } from "@workspace/app-ui/providers/theme-provider";
import { useSocket } from "@workspace/app-ui/hooks/use-socket";

import { DesktopTitlebar } from "@/components/navbar";
import { SetupApplicationUI } from "@/components/setup";
import { getCachedSession } from "@/lib/auth";
import { useStore } from "@/hooks/useStore";

export const Route = createFileRoute("/home")({
  async beforeLoad() {
    const { isAuthenticated } = await getCachedSession();
    if (!isAuthenticated) {
      throw redirect({ to: "/login" });
    }
  },
  component: RouteComponent,
});

interface AppConfig {
  isSetup: boolean;
  fileLocation: string;
}

function RouteComponent() {
  const [isSetup, setIsSetup] = useState<boolean>(false);
  const location = useLocation();
  const {
    isGlobalLoading,
    notificationStatus,
    toggleNotification,
    setMode,
    setGlobalLoading,
  } = useNekoShare();
  const { theme, setTheme } = useTheme();
  const { get } = useStore();
  const { connect, disconnect, } = useSocket();

  const titlebarHelperActions = useMemo(
    () => [
      // TODO: Remove when on production
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
    [notificationStatus, theme],
  );

  const handleSetupComplete = () => {
    setIsSetup(true);
  };

  useEffect(() => {
    if (!isSetup) return;

    const initSocket = async () => {
      try {
        await connect();
      } catch (error) {
        console.error("WebSocket connection failed:", error);
      }
    };

    initSocket();

    return () => {
      disconnect();
    };
  }, [isSetup, connect, disconnect]);

  useEffect(() => {
    const init = async () => {
      try {
        const appConfig = await get<AppConfig>("appConfig");
        setIsSetup(appConfig?.isSetup ?? false);
      } catch (error) {
        console.error("Failed to load app config:", error);
      } finally {
        setGlobalLoading(false);
      }
    };
    init();
  }, [get, setGlobalLoading]);

  if (isGlobalLoading) return;

  return (
    <div className="min-h-svh flex flex-col">
      {isSetup === true ? (
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
            <SetupApplicationUI onSetupComplete={handleSetupComplete} />
          </div>
        </>
      )}
    </div>
  );
}

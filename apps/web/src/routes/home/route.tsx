import { useEffect, useMemo } from "react";

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
import { getCachedSession } from "@workspace/app-ui/lib/auth";
import { useTheme } from "@workspace/app-ui/providers/theme-provider";

import { WebTitlebar } from "@/components/navbar";

export const Route = createFileRoute("/home")({
  async beforeLoad() {
    const result = await getCachedSession();

    if (result.status === "success") {
      if (!result.data.isAuthenticated || !result.data.session) {
        throw redirect({ to: "/login" });
      }

      return {
        session: result.data.session.session,
        user: result.data.session.user,
      };
    }

    console.error("Failed to fetch session:", result.error.toUserMessage());
    throw redirect({ to: "/login" });
  },
  component: RouteComponent,
});

function RouteComponent() {
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const { setGlobalLoading, setMode, toggleNotification, notificationStatus } =
    useNekoShare();

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

  useEffect(() => {
    setGlobalLoading(false);
  }, [setGlobalLoading]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <WebTitlebar helperActions={titlebarHelperActions} />
      <div className="flex flex-1 divide-x overflow-hidden">
        <HomeSidebar
          linkComponent={Link}
          pathname={location.pathname}
          mode="desktop"
          collapseWhenNotificationOpen={notificationStatus === "on"}
        />
        <div className="flex-1 bg-muted p-4 flex flex-col min-w-0 overflow-hidden">
          <Outlet />
        </div>
        <NotificationSidebar />
      </div>
    </div>
  );
}

import { useEffect, useMemo } from "react";

import {
  createFileRoute,
  Link,
  Outlet,
  useLocation,
  useRouter,
} from "@tanstack/react-router";
import { LuBell, LuMoon, LuSettings, LuSun } from "react-icons/lu";

import { HomeSidebar } from "@workspace/app-ui/components/home-sidebar";
import { NotificationSidebar } from "@workspace/app-ui/components/notification-sidebar";
import {
  NekoShareProvider,
  useNekoShare,
} from "@workspace/app-ui/context/nekoshare";
import { authClient, type SessionUser } from "@workspace/app-ui/lib/auth";
import {
  useAccountThemeSync,
  useTheme,
} from "@workspace/app-ui/providers/theme-provider";

import { WebTitlebar } from "@/components/navbar";
import { AppI18nProvider, useAccountLanguageSync } from "@workspace/i18n/react";

export const Route = createFileRoute("/home")({
  async beforeLoad() {
    const { requireAuthenticatedSession } = await import("@/lib/route-auth");

    return requireAuthenticatedSession();
  },
  component: RouteComponent,
});

function RouteComponent() {
  const router = useRouter();

  return (
    <AppI18nProvider>
      <NekoShareProvider
        router={router}
        currentDevice={undefined}
        appMode="web"
      >
        <HomeRouteContent />
      </NekoShareProvider>
    </AppI18nProvider>
  );
}

function HomeRouteContent() {
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const { setGlobalLoading, setMode, toggleNotification, notificationStatus } =
    useNekoShare();
  const { user } = Route.useRouteContext();
  const { data: sessionData } = authClient.useSession();
  const sessionUser = sessionData?.user as SessionUser | undefined;

  useAccountLanguageSync(sessionUser?.language ?? user?.language);
  useAccountThemeSync(sessionUser?.theme ?? user?.theme);

  const titlebarHelperActions = useMemo(
    () => [
      {
        icon: theme === "dark" ? <LuMoon /> : <LuSun />,
        label:
          theme === "dark" ? "Switch to light theme" : "Switch to dark theme",
        onClick: () => setTheme(theme === "dark" ? "light" : "dark"),
      },
      {
        icon: <LuBell />,
        label:
          notificationStatus === "on"
            ? "Close notifications"
            : "Open notifications",
        onClick: () => toggleNotification(),
        badge: true,
        actived: notificationStatus === "on",
      },
      {
        icon: <LuSettings />,
        label: "Open settings",
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
          mode="website"
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

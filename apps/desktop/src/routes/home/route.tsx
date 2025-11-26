import { DesktopTitlebar } from "@/components/navbar";
import { authClient } from "@/lib/auth";
import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
} from "@tanstack/react-router";

import { HomeSidebar } from "@workspace/app-ui/components/home-sidebar";
import { NotificationSidebar } from "@workspace/app-ui/components/notification-sidebar";
import { useNekoShare } from "@workspace/app-ui/context/nekoshare";
import { useMemo } from "react";
import { LuBell, LuSettings } from "react-icons/lu";

export const Route = createFileRoute("/home")({
  // TODO: Do not forget to enable authentication
  // async beforeLoad() {
  //   const { data: session, error } = await authClient.getSession();
  //   const isAuthenticated = !!session?.user && !error;
  //   if (!isAuthenticated) {
  //     throw redirect({ to: "/login" });
  //   }
  // },
  component: RouteComponent,
});

function RouteComponent() {
  const { notification, toggleNotification } = useNekoShare();

  const titlebarHelperActions = useMemo(
    () => [
      {
        icon: <LuBell />,
        onClick: () => toggleNotification(),
        badge: true,
        actived: notification === "on",
      },
      {
        icon: <LuSettings />,
        onClick: () => {
          console.log("Settings clicked");
        },
      },
    ],
    [toggleNotification],
  );
  return (
    <div className="min-h-svh flex flex-col">
      <DesktopTitlebar helperActions={titlebarHelperActions} />
      <div className="flex flex-1 divide-x">
        <HomeSidebar
          linkComponent={Link}
          pathname={location.pathname}
          mode="desktop"
        />
        <div className="flex-1 bg-muted p-4">
          <Outlet />
        </div>
        <NotificationSidebar />
      </div>
    </div>
  );
}

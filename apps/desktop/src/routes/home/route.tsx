import { DesktopTitlebar } from "@/components/navbar";
import { authClient } from "@/lib/auth";
import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
} from "@tanstack/react-router";

import { HomeSidebar } from "@workspace/app-ui/components/home-sidebar";

export const Route = createFileRoute("/home")({
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
  return (
    <div className="min-h-svh flex flex-col">
      <DesktopTitlebar />
      <div className="flex flex-1 divide-x">
        <HomeSidebar
          linkComponent={Link}
          pathname={location.pathname}
          mode="desktop"
        />
        <div className="flex-1 bg-muted p-4">
          <Outlet />
        </div>
        {/* <AnimatePresence mode="wait">
          {notification === "on" && <NotificationSidebar />}
        </AnimatePresence> */}
      </div>
    </div>
  );
}

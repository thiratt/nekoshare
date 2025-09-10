import { useNekoShare } from "@/context/nekoshare";
import { authClient } from "@/libs/auth";
import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useLocation,
  useRouter,
} from "@tanstack/react-router";
import { HomeSidebar } from "@workspace/app-ui/components/home-sidebar";
import { NotificationSidebar } from "@workspace/app-ui/components/notification-sidebar";
import { useNotification } from "@workspace/app-ui/hooks/useNotification";
import { AnimatePresence } from "motion/react";
import { useCallback } from "react";

export const Route = createFileRoute("/home")({
  beforeLoad: async ({ location }) => {
    const session = await authClient.getSession();
    if (!session.data) {
      throw redirect({
        to: "/auth/login",
        search: {
          redirect: location.href,
        },
      });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  const router = useRouter();
  const location = useLocation();
  const { setMode } = useNekoShare();
  const { isOpen, toggleSidebar } = useNotification();

  const onSettings = useCallback(async () => {
    setMode("setting");
  }, []);

  const onSignout = useCallback(async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.navigate({ to: "/auth/login", search: { redirect: "home" } });
        },
      },
    });
  }, []);

  return (
    <div className="min-h-svh flex flex-col">
      <div className="flex flex-1 divide-x">
        <HomeSidebar
          linkComponent={Link}
          pathname={location.pathname}
          onSettings={onSettings}
          onNavigations={toggleSidebar}
          onSignout={onSignout}
        />
        <div className="flex-1 bg-muted p-4">
          <Outlet />
        </div>
        <AnimatePresence mode="wait">
          {isOpen && (
            <NotificationSidebar
              isOpen={isOpen}
              toggleSidebar={toggleSidebar}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

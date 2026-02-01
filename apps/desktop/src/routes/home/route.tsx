import { useCallback, useEffect, useMemo } from "react";

import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useLocation,
} from "@tanstack/react-router";
import { stat } from "@tauri-apps/plugin-fs";
import { LuBell, LuMoon, LuSettings, LuSun } from "react-icons/lu";

import { HomeSidebar } from "@workspace/app-ui/components/home-sidebar";
import { NotificationSidebar } from "@workspace/app-ui/components/notification-sidebar";
import {
  createFileEntry,
  DropOverlayProvider,
  DropOverlayUI,
  type FileEntry,
  transformDevices,
  transformFriends,
} from "@workspace/app-ui/components/ui/drop-overlay/index";
import {
  useNekoShare,
  useSetGlobalLoading,
} from "@workspace/app-ui/context/nekoshare";
import { useDevices } from "@workspace/app-ui/hooks/use-devices";
import { useFriends } from "@workspace/app-ui/hooks/use-friends";
import { useNekoSocket } from "@workspace/app-ui/hooks/useNekoSocket";
import { usePacketRouter } from "@workspace/app-ui/hooks/usePacketRouter";
import { useSocketInterval } from "@workspace/app-ui/hooks/useSocketInterval";
import { PacketType } from "@workspace/app-ui/lib/nk-socket/index";
import { useTheme } from "@workspace/app-ui/providers/theme-provider";

import { DesktopTitlebar } from "@/components/navbar";
import { SetupApplicationUI } from "@/components/setup";
import { useNSDesktop } from "@/context/NSDesktopContext";
import { useTauriFileDrop } from "@/hooks/use-tauri-file-drop";
import { getCachedSession } from "@/lib/auth";
import { getDeviceInfo } from "@/lib/device";

export const Route = createFileRoute("/home")({
  async beforeLoad() {
    const result = await getCachedSession();

    if (result.status === "success") {
      if (!result.data.isAuthenticated) {
        throw redirect({ to: "/login" });
      }
    } else {
      console.error("Failed to fetch session:", result.error.toUserMessage());
    }
  },
  component: RouteComponent,
});

interface HomeContentProps {
  isReady: boolean;
  titlebarHelperActions: {
    icon: React.ReactNode;
    onClick: () => void;
    badge?: boolean;
    actived?: boolean;
  }[];
  location: { pathname: string };
  notificationStatus: "on" | "off";
}

function HomeContent({
  isReady,
  titlebarHelperActions,
  location,
  notificationStatus,
}: HomeContentProps) {
  useTauriFileDrop({ enabled: isReady });

  const { devices: rawDevices } = useDevices();
  const { friends: rawFriends } = useFriends();

  const devices = useMemo(
    () => transformDevices(rawDevices, { excludeCurrentDevice: true }),
    [rawDevices],
  );
  const friends = useMemo(() => transformFriends(rawFriends), [rawFriends]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {isReady ? (
        <>
          <DesktopTitlebar helperActions={titlebarHelperActions} />
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
          <DropOverlayUI devices={devices} friends={friends} />
        </>
      ) : (
        <>
          <DesktopTitlebar />
          <div className="flex flex-1 divide-x items-center justify-center">
            <SetupApplicationUI />
          </div>
        </>
      )}
    </div>
  );
}

function RouteComponent() {
  const { status, isReady, initComplete } = useNSDesktop();
  const setGlobalLoading = useSetGlobalLoading();

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

  useSocketInterval(async () => {
    try {
      const deviceInfo = await getDeviceInfo();
      const payload = {
        battery: {
          supported: deviceInfo.battery.supported,
          charging: deviceInfo.battery.charging,
          percent: Math.round(deviceInfo.battery.percent),
        },
        ip: {
          ipv4: deviceInfo.ip.ipv4,
          ipv6: deviceInfo.ip.ipv6 ?? null,
        },
      };
      send(PacketType.SYSTEM_HEARTBEAT, (w) =>
        w.writeString(JSON.stringify(payload)),
      );
    } catch (error) {
      console.error("Failed to send heartbeat with device info:", error);
      send(PacketType.SYSTEM_HEARTBEAT);
    }
  }, 7000);

  useEffect(() => {
    setGlobalLoading(false);
  }, [setGlobalLoading]);

  const handleProcessFiles = useCallback(
    async (paths: string[]): Promise<FileEntry[]> => {
      const promises = paths.map(async (path) => {
        try {
          const fileStat = await stat(path);
          return createFileEntry(path, fileStat.size);
        } catch (error) {
          console.error(`Failed to get stats for ${path}:`, error);
          return createFileEntry(path, 0);
        }
      });

      return Promise.all(promises);
    },
    [],
  );

  const handleQuickUpload = useCallback(
    (files: string[], targetId: string, targetType: "device" | "friend") => {
      console.log(`Quick upload to ${targetType}: ${targetId}`, files);
      // TODO: Implement immediate upload logic
    },
    [],
  );

  if (!initComplete || globalLoading || status === "loading") {
    return null;
  }

  return (
    <DropOverlayProvider
      onProcessFiles={handleProcessFiles}
      onQuickUpload={handleQuickUpload}
    >
      <HomeContent
        isReady={isReady}
        titlebarHelperActions={titlebarHelperActions}
        location={location}
        notificationStatus={notificationStatus}
      />
    </DropOverlayProvider>
  );
}

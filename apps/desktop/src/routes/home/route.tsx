import { useCallback, useEffect, useMemo, useRef } from "react";

import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useLocation,
} from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { stat } from "@tauri-apps/plugin-fs";
import { LuBell, LuMoon, LuSettings, LuSun } from "react-icons/lu";

import { useToast } from "@workspace/ui/hooks/use-toast";

import { HomeSidebar } from "@workspace/app-ui/components/home-sidebar";
import { NotificationSidebar } from "@workspace/app-ui/components/notification-sidebar";
import {
  createFileEntry,
  DropOverlayProvider,
  DropOverlayUI,
  type FileEntry,
  type GlobalOptions,
  transformDevices,
  transformFriends,
} from "@workspace/app-ui/components/ui/drop-overlay/index";
import {
  useNekoShareDesktop,
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
import {
  type TransferProgressEvent,
  useTransferStore,
} from "@/lib/store/transfers";
import { parseDropZoneId } from "@/lib/transfer";

export const Route = createFileRoute("/home")({
  async beforeLoad() {
    const result = await getCachedSession();

    if (result.status === "success") {
      if (!result.data.isAuthenticated || !result.data.session) {
        throw redirect({ to: "/login" });
      }

      return {
        session: result.data.session,
        user: result.data.session.user,
      };
    } else {
      console.error("Failed to fetch session:", result.error.toUserMessage());

      // TODO: Implement error display as soon as possible
      // because failed to get session means server is unreachable
      // but it's not ideal to redirect user to login page in this case
      throw redirect({ to: "/login" });
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
  const {
    currentDevice,
    globalLoading,
    notificationStatus,
    toggleNotification,
    setMode,
  } = useNekoShareDesktop();
  const { user } = Route.useRouteContext();
  const { theme, setTheme } = useTheme();
  const { send } = useNekoSocket();
  const { devices } = useDevices();
  const { toast } = useToast();
  const upsertTransfer = useTransferStore((state) => state.upsertFromEvent);
  const registerIncomingMeta = useTransferStore(
    (state) => state.registerIncomingMeta,
  );
  const clearOldTransfers = useTransferStore((state) => state.clearOld);
  const pendingTransfers = useRef<Map<string, string[]>>(new Map());
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
    [PacketType.FILE_OFFER]: async (message) => {
      if (message.status === "error") {
        toast.error(`File offer error: ${message.error}`);

        return;
      }

      console.log("[PacketRouter] Received FILE_OFFER:", message.data);

      const {
        senderDeviceId,
        senderDeviceFingerprint,
        senderDeviceName,
        senderUserId,
        senderUserName,
        transferId,
      } = message.data;

      const sameAccount = senderUserId
        ? senderUserId === user.id
        : devices.some((d) => d.id === senderDeviceId);

      registerIncomingMeta({
        transferId,
        sourceUserId: senderUserId ?? null,
        sourceUserName: senderUserName ?? null,
        sourceDeviceId: senderDeviceId ?? null,
        sourceDeviceName: senderDeviceName ?? null,
        sameAccount,
      });

      const hasActiveDirect = await invoke<boolean>(
        "socket_server_has_active_connection",
      );

      let address = "0.0.0.0";
      let port = 0;
      let reuse = false;

      if (!hasActiveDirect) {
        // Automatically accept all incoming file offers for now
        const a = await invoke<{
          address: string;
          port: number;
          message?: string;
        }>("socket_server_start", {
          senderFingerprint: senderDeviceFingerprint,
        });

        address = a.address;
        port = a.port;
      } else {
        reuse = true;
      }

      const acceptPayload = {
        transferId: transferId,
        senderDeviceId: senderDeviceId,
        receiverDeviceId: user.deviceId,
        receiverFingerprint: currentDevice.fingerprint,
        address,
        port,
        reuse,
      };

      send(PacketType.FILE_ACCEPT, (w) => {
        w.writeString(JSON.stringify(acceptPayload));
      });

      if (!reuse) {
        console.log("[FILE_OFFER] Listening for incoming connection on:", {
          address,
          port,
        });
      } else {
        console.log("[FILE_OFFER] Reusing existing direct connection");
      }
    },
    [PacketType.FILE_ACCEPT]: async (message) => {
      if (message.status === "error") {
        toast.error(`File accept error: ${message.error}`);

        return;
      }

      console.log("[PacketRouter] Received FILE_ACCEPT:", message.data);
      const {
        transferId,
        address,
        port,
        receiverDeviceId,
        receiverFingerprint,
      } = message.data;
      await invoke("socket_client_connect_to", {
        deviceId: user.deviceId,
        receiverId: receiverDeviceId,
        receiverAddress: address,
        receiverPort: port,
        receiverFingerprint,
        route: "direct",
      });

      const filesToSend = pendingTransfers.current.get(transferId);

      if (filesToSend) {
        console.log(
          `[FILE_ACCEPT] Starting transfer for ${transferId}`,
          filesToSend,
        );

        await invoke("socket_client_send_files", {
          deviceId: user.deviceId,
          targetId: receiverDeviceId,
          filePaths: filesToSend,
          transferId,
          sourceUserId: user.id,
          sourceUserName: user.name ?? null,
          sourceDeviceName: currentDevice.name,
          route: "direct",
        });

        pendingTransfers.current.delete(transferId);
        toast.success("Transfer started!");
      } else {
        console.error(
          `[FILE_ACCEPT] No pending files found for transfer ${transferId}`,
        );
        toast.error("Transfer failed: Session expired or files lost");
      }
    },
    [PacketType.FILE_REJECT]: (message) => {
      if (message.status === "error") {
        toast.error(`File reject error: ${message.error}`);
        return;
      }

      console.log("[PacketRouter] Received FILE_REJECT:", message.data);
    },
    [PacketType.ERROR_GENERIC]: (message) => {
      console.error("Received ERROR_GENERIC packet:", message);
    },
  });

  useSocketInterval(async () => {
    try {
      send(PacketType.SYSTEM_HEARTBEAT);
    } catch (error) {
      console.error("Failed to send heartbeat:", error);
      send(PacketType.SYSTEM_HEARTBEAT);
    }
  }, 7000);

  useEffect(() => {
    setGlobalLoading(false);
  }, [setGlobalLoading]);

  useEffect(() => {
    let unlistenFn: null | (() => void) = null;
    let active = true;

    const setup = async () => {
      const unlisten = await listen<TransferProgressEvent>(
        "transfer-progress",
        (event) => {
          if (!active) return;
          upsertTransfer(event.payload);
        },
      );

      if (!active) {
        unlisten();
        return;
      }

      unlistenFn = unlisten;
    };

    setup();

    const cleanupInterval = window.setInterval(() => {
      clearOldTransfers(1000 * 60 * 60 * 24);
    }, 1000 * 60);

    return () => {
      active = false;
      window.clearInterval(cleanupInterval);
      if (unlistenFn) {
        unlistenFn();
      }
    };
  }, [upsertTransfer, clearOldTransfers]);

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
    async (
      files: string[],
      targetId: string,
      targetType: "device" | "friend",
    ) => {
      console.log(
        `[Transfer] Quick upload to ${targetType}: ${targetId}`,
        files,
      );

      if (targetType === "device") {
        const parsed = parseDropZoneId(targetId);
        if (parsed.type === "device") {
          const device = devices.find((d) => d.id === parsed.id);
          console.log("[Transfer] Resolved device:", device);
          if (!device) {
            toast.error("Device not found");
            return;
          }

          if (device.status !== "online") {
            toast.error(`${device.name} is offline`);
            return;
          }

          const transferId = crypto.randomUUID();
          const filesPayload = await Promise.all(
            files.map(async (filePath) => {
              const fileStat = await stat(filePath);
              const fileName = filePath.split(/[\\/]/).pop() || filePath;
              const extension = fileName.includes(".")
                ? fileName.split(".").pop() || ""
                : "";
              return {
                fileName,
                extension,
                size: fileStat.size,
              };
            }),
          );

          pendingTransfers.current.set(transferId, files);

          const offerPayload = {
            transferId,
            fromDeviceId: user.deviceId,
            toDeviceId: device.id,
            files: filesPayload,
          };

          send(PacketType.FILE_OFFER, (w) => {
            w.writeString(JSON.stringify(offerPayload));
          });

          toast.info(`Sending ${files.length} file(s) to ${device.name}...`);
        }
      } else if (targetType === "friend") {
        toast.info("Friend transfers coming soon!");
      }
    },
    [devices, send, toast, user.deviceId],
  );

  const handleSendFiles = useCallback(
    (files: FileEntry[], targets: string[], _options: GlobalOptions) => {
      console.log(`[Transfer] Send files to targets:`, targets, files);

      for (const target of targets) {
        const parsed = parseDropZoneId(target);

        if (parsed.type === "device") {
          const device = devices.find((d) => d.id === parsed.id);

          if (!device) {
            toast.error(`Device not found for target: ${target}`);
            continue;
          }

          if (device.status !== "online") {
            toast.error(`${device.name} is offline`);
            continue;
          }

          // const filePaths = files.map((f) => f.path);
          // toast.info(`Sending ${files.length} file(s) to ${device.name}...`);
          toast.info(`Feature coming soon!`);
        } else if (parsed.type === "friend") {
          toast.info("Friend transfers coming soon!");
        }
      }
    },
    [devices, toast],
  );

  if (!initComplete || globalLoading || status === "loading") {
    return null;
  }

  return (
    <DropOverlayProvider
      onProcessFiles={handleProcessFiles}
      onQuickUpload={handleQuickUpload}
      onSendFiles={handleSendFiles}
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

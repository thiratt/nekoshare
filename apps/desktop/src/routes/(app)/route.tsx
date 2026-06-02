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
  useDropOverlayActions,
} from "@workspace/app-ui/components/ui/drop-overlay/index";
import {
  useNekoShareDesktop,
  useSetGlobalLoading,
} from "@workspace/app-ui/context/nekoshare";
import { useDevices } from "@workspace/app-ui/hooks/use-devices";
import { useFriends } from "@workspace/app-ui/hooks/use-friends";
import { useSidebar } from "@workspace/app-ui/hooks/use-sidebar";
import { useNekoSocket } from "@workspace/app-ui/hooks/useNekoSocket";
import { usePacketRouter } from "@workspace/app-ui/hooks/usePacketRouter";
import { useSocketInterval } from "@workspace/app-ui/hooks/useSocketInterval";
import { PacketType } from "@workspace/app-ui/lib/nk-socket";
import {
  useAccountThemeSync,
  useTheme,
} from "@workspace/app-ui/providers/theme-provider";
import type { Mode } from "@workspace/app-ui/types/context";

import { DesktopTitlebar } from "@/components/navbar";
import { SetupApplicationUI } from "@/components/setup";
import { useNSDesktop } from "@/context/NSDesktopContext";
import { useTauriFileDrop } from "@/hooks/use-tauri-file-drop";
import { authClient, getCachedSession, type SessionUser } from "@/lib/auth";
import { requestRelayTicket } from "@/lib/relay-transfer";
import {
  type TransferProgressEvent,
  useTransferStore,
} from "@/lib/store/transfers";
import { parseDropZoneId } from "@/lib/transfer";
import { useAccountLanguageSync } from "@workspace/i18n/react";

type TransferMode = "AUTO" | "LAN_DIRECT" | "RELAY";
type TransferTransportKind = "NATIVE_TCP" | "RELAY_WS" | "RELAY_NATIVE";
type TransferDecision = {
  mode: TransferMode;
  attemptedTransport: TransferTransportKind;
  fallbackReason?: string;
};

const TRANSFER_MODE_ENV = String(
  import.meta.env.VITE_TRANSFER_MODE ?? "auto",
).toLowerCase();
const SELECTED_TRANSFER_MODE: TransferMode =
  TRANSFER_MODE_ENV === "relay"
    ? "RELAY"
    : TRANSFER_MODE_ENV === "lan_direct" || TRANSFER_MODE_ENV === "direct"
      ? "LAN_DIRECT"
      : "AUTO";
const DIRECT_FALLBACK_TIMEOUT_MS = Number.isFinite(
  Number(import.meta.env.VITE_TRANSFER_DIRECT_TIMEOUT_MS),
)
  ? Math.max(500, Number(import.meta.env.VITE_TRANSFER_DIRECT_TIMEOUT_MS))
  : 3000;
const RELAY_TICKET_RETRY_DELAYS_MS = [150, 350, 700];
const START_RELAY_RECEIVER_ACTION = "START_RELAY_RECEIVER";

type RelayReceiverFallbackSignal = {
  action: typeof START_RELAY_RECEIVER_ACTION;
  transferId: string;
  reason?: string;
};

function logTransferDecision(transferId: string, decision: TransferDecision) {
  console.log("[TransferTransport] decision", {
    transferId,
    mode: decision.mode,
    attemptedTransport: decision.attemptedTransport,
    fallbackReason: decision.fallbackReason,
  });
}

function createTimeoutError(message: string) {
  return new Error(message);
}

async function withTimeout<T>(
  task: Promise<T>,
  timeoutMs: number,
  message: string,
  onTimeout?: () => void,
): Promise<T> {
  let timeoutId: number | undefined;
  const timeoutTask = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => {
      onTimeout?.();
      reject(createTimeoutError(message));
    }, timeoutMs);
  });

  try {
    return await Promise.race([task, timeoutTask]);
  } finally {
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
    }
  }
}

async function toRelayFiles(filePaths: string[]) {
  return Promise.all(
    filePaths.map(async (filePath) => {
      const fileStat = await stat(filePath);
      const fileName = filePath.split(/[\\/]/).pop() || filePath;
      return {
        path: filePath,
        fileName,
        size: fileStat.size,
      };
    }),
  );
}

async function requestRelayTicketWithRetry(
  transferId: string,
  deviceId: string,
) {
  let lastError: unknown;

  for (
    let attempt = 0;
    attempt <= RELAY_TICKET_RETRY_DELAYS_MS.length;
    attempt++
  ) {
    try {
      return await requestRelayTicket(transferId, deviceId);
    } catch (error) {
      lastError = error;
      const delay = RELAY_TICKET_RETRY_DELAYS_MS[attempt];
      if (delay === undefined) {
        break;
      }

      await new Promise((resolve) => window.setTimeout(resolve, delay));
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Relay ticket request failed");
}

export const Route = createFileRoute("/(app)")({
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
  sidebarToggle: {
    isOpen: boolean;
    onToggle: () => void;
    disabled?: boolean;
  };
  location: { pathname: string };
  mode: Mode;
  notificationStatus: "on" | "off";
}

function HomeContent({
  isReady,
  titlebarHelperActions,
  sidebarToggle,
  location,
  mode,
  notificationStatus,
}: HomeContentProps) {
  const isHomeRoute =
    location.pathname === "/home" || location.pathname === "/home/";
  const isShareComposerRoute = location.pathname === "/share/new";
  const disableGlobalDropOverlay =
    mode !== "home" || isHomeRoute || isShareComposerRoute;
  const { close } = useDropOverlayActions();

  useTauriFileDrop({ enabled: isReady && !disableGlobalDropOverlay });

  useEffect(() => {
    if (disableGlobalDropOverlay) {
      close();
    }
  }, [close, disableGlobalDropOverlay]);

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
          <DesktopTitlebar
            helperActions={titlebarHelperActions}
            sidebarToggle={sidebarToggle}
          />
          <div className="flex flex-1 divide-x overflow-hidden">
            <HomeSidebar
              linkComponent={Link}
              pathname={location.pathname}
              mode="desktop"
              collapseWhenNotificationOpen={notificationStatus === "on"}
              isOpen={sidebarToggle.isOpen}
            />
            <main className="flex-1 p-4 flex flex-col min-w-0 overflow-hidden">
              <Outlet />
            </main>
            <NotificationSidebar />
          </div>
          {!disableGlobalDropOverlay ? (
            <DropOverlayUI devices={devices} friends={friends} />
          ) : null}
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
    notificationStatus,
    toggleNotification,
    mode,
    setMode,
  } = useNekoShareDesktop();
  const { user } = Route.useRouteContext();
  const { data: sessionData } = authClient.useSession();
  const sessionUser = sessionData?.user as SessionUser | undefined;
  const userId = user?.id ?? null;
  const userDeviceId = user?.deviceId ?? null;
  useAccountLanguageSync(sessionUser?.language ?? user?.language);
  useAccountThemeSync(sessionUser?.theme ?? user?.theme);
  const { theme, setTheme } = useTheme();
  const { isOpen: isSidebarOpen, toggleSidebar } = useSidebar();
  const { send, on } = useNekoSocket();
  const { devices } = useDevices();
  const { toast } = useToast();
  const upsertTransfer = useTransferStore((state) => state.upsertFromEvent);
  const registerIncomingMeta = useTransferStore(
    (state) => state.registerIncomingMeta,
  );
  const clearOldTransfers = useTransferStore((state) => state.clearOld);
  const pendingTransfers = useRef<Map<string, string[]>>(new Map());
  const pendingTransferEvents = useRef<Map<string, TransferProgressEvent>>(
    new Map(),
  );
  const relayReceiverStarters = useRef<
    Map<string, (fallbackReason?: string) => Promise<void>>
  >(new Map());
  const flushTimerRef = useRef<number | null>(null);
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
      if (!userId || !userDeviceId) {
        console.error(
          "[PacketRouter] Missing session user/device id for FILE_OFFER",
        );
        return;
      }

      const sameAccount = senderUserId
        ? senderUserId === userId
        : devices.some((d) => d.id === senderDeviceId);

      registerIncomingMeta({
        transferId,
        sourceUserId: senderUserId ?? null,
        sourceUserName: senderUserName ?? null,
        sourceDeviceId: senderDeviceId ?? null,
        sourceDeviceName: senderDeviceName ?? null,
        sameAccount,
      });

      let address = "0.0.0.0";
      let port = 0;
      let reuse = false;

      logTransferDecision(transferId, {
        mode: SELECTED_TRANSFER_MODE,
        attemptedTransport:
          SELECTED_TRANSFER_MODE === "RELAY" ? "RELAY_WS" : "NATIVE_TCP",
      });

      if (SELECTED_TRANSFER_MODE !== "RELAY") {
        const hasActiveDirect = await invoke<boolean>(
          "socket_server_has_active_connection",
        );

        if (!hasActiveDirect) {
          try {
            console.log("[TransferTransport] direct listener start", {
              transferId,
              timeoutMs: DIRECT_FALLBACK_TIMEOUT_MS,
            });
            const a = await invoke<{
              address: string;
              port: number;
              message?: string;
            }>("socket_server_start", {
              senderFingerprint: senderDeviceFingerprint,
            });

            address = a.address;
            port = a.port;
          } catch (error) {
            console.error("[TransferTransport] direct listener failed", {
              transferId,
              error,
            });
            if (SELECTED_TRANSFER_MODE === "LAN_DIRECT") {
              toast.error("Direct receive setup failed");
              return;
            }
          }
        } else {
          reuse = true;
        }
      }

      const acceptPayload = {
        transferId: transferId,
        senderDeviceId: senderDeviceId,
        receiverDeviceId: userDeviceId,
        receiverFingerprint: currentDevice.fingerprint,
        address,
        port,
        reuse,
      };

      send(PacketType.FILE_ACCEPT, (w) => {
        w.writeString(JSON.stringify(acceptPayload));
      });

      let relayReceiverStarted = false;
      const startRelayReceiver = async (fallbackReason?: string) => {
        if (relayReceiverStarted) {
          console.log("[TransferTransport] relay receiver already started", {
            transferId,
            fallbackReason,
          });
          return;
        }

        relayReceiverStarted = true;
        try {
          logTransferDecision(transferId, {
            mode: SELECTED_TRANSFER_MODE,
            attemptedTransport: "RELAY_WS",
            fallbackReason,
          });
          console.log("[TransferTransport] relay receiver start", {
            transferId,
            fallbackReason,
          });
          const relayTicket = await requestRelayTicketWithRetry(
            transferId,
            userDeviceId,
          );
          await invoke("relay_receive_transfer", {
            input: {
              transferId,
              relayUrl: relayTicket.relayUrl,
              token: relayTicket.token,
            },
          });
          console.log("[FILE_OFFER] Relay receiver connected for:", transferId);
        } catch (error) {
          console.error("[FILE_OFFER] Failed to start relay receiver:", error);
          toast.error("Relay receive setup failed");
        }
      };

      if (SELECTED_TRANSFER_MODE === "AUTO") {
        relayReceiverStarters.current.set(transferId, startRelayReceiver);
      }

      if (SELECTED_TRANSFER_MODE === "RELAY") {
        await startRelayReceiver("manual relay mode");
      }

      if (SELECTED_TRANSFER_MODE === "RELAY") {
        console.log("[FILE_OFFER] Direct listener skipped for relay mode", {
          transferId,
        });
      } else if (!reuse) {
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
      if (!userId || !userDeviceId) {
        console.error(
          "[PacketRouter] Missing session user/device id for FILE_ACCEPT",
        );
        return;
      }

      const filesToSend = pendingTransfers.current.get(transferId);
      if (!filesToSend) {
        console.error(
          `[FILE_ACCEPT] No pending files found for transfer ${transferId}`,
        );
        toast.error("Transfer failed: Session expired or files lost");
        return;
      }

      let relaySenderStarted = false;
      const requestReceiverRelayFallback = (fallbackReason: string) => {
        const signal: RelayReceiverFallbackSignal = {
          action: START_RELAY_RECEIVER_ACTION,
          transferId,
          reason: fallbackReason,
        };

        console.log("[TransferTransport] requesting receiver relay fallback", {
          transferId,
          fallbackReason,
        });
        send(PacketType.FILE_ACK, (w) => {
          w.writeString(receiverDeviceId);
          w.writeString(JSON.stringify(signal));
        });
      };

      const startRelaySender = async (fallbackReason?: string) => {
        if (relaySenderStarted) {
          console.log("[TransferTransport] relay sender already started", {
            transferId,
            fallbackReason,
          });
          return;
        }

        relaySenderStarted = true;
        try {
          logTransferDecision(transferId, {
            mode: SELECTED_TRANSFER_MODE,
            attemptedTransport: "RELAY_WS",
            fallbackReason,
          });
          console.log("[TransferTransport] relay sender start", {
            transferId,
            fallbackReason,
          });
          const relayTicket = await requestRelayTicketWithRetry(
            transferId,
            userDeviceId,
          );
          const relayFiles = await toRelayFiles(filesToSend);

          await invoke("relay_send_files", {
            input: {
              transferId,
              relayUrl: relayTicket.relayUrl,
              token: relayTicket.token,
              files: relayFiles,
              targetDeviceId: receiverDeviceId,
              sourceUserId: userId,
              sourceUserName: user.name ?? null,
              sourceDeviceId: userDeviceId,
              sourceDeviceName: currentDevice.name,
            },
          });

          pendingTransfers.current.delete(transferId);
          toast.success("Relay transfer started!");
        } catch (error) {
          console.error("[FILE_ACCEPT] Failed to start relay sender:", error);
          toast.error("Relay transfer failed to start");
        }
      };

      const connectDirectSender = async (isLateConnect?: () => boolean) => {
        logTransferDecision(transferId, {
          mode: SELECTED_TRANSFER_MODE,
          attemptedTransport: "NATIVE_TCP",
        });
        console.log("[TransferTransport] direct sender setup start", {
          transferId,
          address,
          port,
          timeoutMs: DIRECT_FALLBACK_TIMEOUT_MS,
        });

        await invoke("socket_client_connect_to", {
          deviceId: userDeviceId,
          receiverId: receiverDeviceId,
          receiverAddress: address,
          receiverPort: port,
          receiverFingerprint,
        });
        if (isLateConnect?.()) {
          console.warn("[TransferTransport] late direct connect ignored", {
            transferId,
          });
          return false;
        }

        console.log("[TransferTransport] direct sender connected", {
          transferId,
        });
        return true;
      };

      const sendDirectFiles = async () => {
        console.log(
          `[FILE_ACCEPT] Starting transfer for ${transferId}`,
          filesToSend,
        );

        await invoke("socket_client_send_files", {
          deviceId: userDeviceId,
          targetId: receiverDeviceId,
          filePaths: filesToSend,
          transferId,
          sourceUserId: userId,
          sourceUserName: user.name ?? null,
          sourceDeviceName: currentDevice.name,
        });

        pendingTransfers.current.delete(transferId);
        console.log("[TransferTransport] direct transfer started", {
          transferId,
        });
        toast.success("Transfer started!");
      };

      const startDirectSender = async () => {
        await connectDirectSender();
        await sendDirectFiles();
      };

      if (SELECTED_TRANSFER_MODE === "RELAY") {
        await startRelaySender("manual relay mode");
        return;
      }

      if (SELECTED_TRANSFER_MODE === "LAN_DIRECT") {
        await startDirectSender();
        return;
      }

      let directTimedOut = false;
      try {
        await withTimeout(
          connectDirectSender(() => directTimedOut),
          DIRECT_FALLBACK_TIMEOUT_MS,
          "Direct transfer setup timed out",
          () => {
            directTimedOut = true;
          },
        );
        await sendDirectFiles();
      } catch (error) {
        const fallbackReason = directTimedOut
          ? "direct setup timeout"
          : error instanceof Error
            ? error.message
            : "direct setup failed";
        console.warn("[TransferTransport] direct sender setup failed/timed out", {
          transferId,
          fallbackReason,
        });
        requestReceiverRelayFallback(fallbackReason);
        await startRelaySender(fallbackReason);
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

  useEffect(() => {
    return on(PacketType.FILE_ACK, (reader) => {
      try {
        const rawData = reader.readString();
        const signal = JSON.parse(rawData) as Partial<RelayReceiverFallbackSignal>;

        if (
          signal.action !== START_RELAY_RECEIVER_ACTION ||
          typeof signal.transferId !== "string"
        ) {
          return;
        }

        const startRelayReceiver = relayReceiverStarters.current.get(
          signal.transferId,
        );
        if (!startRelayReceiver) {
          console.warn("[TransferTransport] receiver relay fallback ignored", {
            transferId: signal.transferId,
            reason: "missing receiver context",
          });
          return;
        }

        void startRelayReceiver(signal.reason ?? "sender direct fallback");
      } catch (error) {
        console.error("[TransferTransport] relay fallback signal failed", {
          error,
        });
      }
    });
  }, [on]);

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

  const flushTransferEvents = useCallback(() => {
    if (pendingTransferEvents.current.size === 0) {
      return;
    }

    const events = Array.from(pendingTransferEvents.current.values());
    pendingTransferEvents.current.clear();

    for (const event of events) {
      upsertTransfer(event);
    }
  }, [upsertTransfer]);

  useEffect(() => {
    let unlistenFn: null | (() => void) = null;
    let active = true;

    const setup = async () => {
      const unlisten = await listen<TransferProgressEvent>(
        "transfer-progress",
        (event) => {
          if (!active) return;

          const payload = event.payload;
          const key = payload.fileId || `batch:${payload.transferId}`;
          pendingTransferEvents.current.set(key, payload);

          if (flushTimerRef.current === null) {
            flushTimerRef.current = window.setTimeout(() => {
              flushTimerRef.current = null;
              flushTransferEvents();
            }, 80);
          }
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
      if (flushTimerRef.current !== null) {
        window.clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      flushTransferEvents();
      window.clearInterval(cleanupInterval);
      if (unlistenFn) {
        unlistenFn();
      }
    };
  }, [flushTransferEvents, clearOldTransfers]);

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
          if (!userDeviceId) {
            toast.error("Session is missing device information");
            return;
          }
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

          const seedTimestamp = Date.now();
          files.forEach((filePath, index) => {
            const meta = filesPayload[index];
            upsertTransfer({
              transferId,
              fileId: `${transferId}:pending:${index}`,
              filePath,
              fileName: meta.fileName,
              direction: "send",
              sourceUserId: userId,
              sourceUserName: user.name ?? null,
              sourceDeviceId: userDeviceId,
              sourceDeviceName: currentDevice.name,
              sameAccount: true,
              targetDeviceId: device.id,
              totalBytes: meta.size,
              sentBytes: 0,
              progressPercent: 0,
              status: "processing",
              error: null,
              timestampMs: seedTimestamp + index,
            });
          });

          pendingTransfers.current.set(transferId, files);

          const offerPayload = {
            transferId,
            fromDeviceId: userDeviceId,
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
    [
      currentDevice.name,
      devices,
      send,
      toast,
      upsertTransfer,
      user,
      userDeviceId,
      userId,
    ],
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

  if (!initComplete || status === "loading") {
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
        sidebarToggle={{
          isOpen: isSidebarOpen,
          onToggle: toggleSidebar,
          disabled: notificationStatus === "on",
        }}
        location={location}
        mode={mode}
        notificationStatus={notificationStatus}
      />
    </DropOverlayProvider>
  );
}

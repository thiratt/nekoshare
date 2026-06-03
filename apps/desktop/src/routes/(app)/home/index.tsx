import { useCallback, useMemo, useRef } from "react";

import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { useToast } from "@workspace/ui/hooks/use-toast";

import {
  transformDevices,
  transformFriends,
} from "@workspace/app-ui/components/ui/drop-overlay/index";
import {
  type HomeDropHandle,
  type HomeSendPayload,
  HomeUI,
} from "@workspace/app-ui/components/ui/home/index";
import { useDevices } from "@workspace/app-ui/hooks/use-devices";
import { useFriends } from "@workspace/app-ui/hooks/use-friends";

import { useHomeSend } from "@/context/home-send";
import {
  type NativeDropZonePayload,
  useNativeDropZones,
} from "@/hooks/use-native-drop-zones";
import { useTransferActivity } from "@/hooks/use-transfer-activity";
import {
  resolveAudioPreview,
  resolveDroppedPaths,
  resolveImagePreview,
  resolvePdfPreview,
  resolveTextPreview,
  resolveVideoPreview,
} from "@/utils/file-preview";

export const Route = createFileRoute("/(app)/home/")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { onHomeSendToDevice } = useHomeSend();
  const homeRef = useRef<HomeDropHandle | null>(null);
  const { devices: rawDevices } = useDevices();
  const { friends: rawFriends } = useFriends();

  const devices = useMemo(
    () => transformDevices(rawDevices, { excludeCurrentDevice: true }),
    [rawDevices],
  );
  const friends = useMemo(() => transformFriends(rawFriends), [rawFriends]);
  const deviceNamesById = useMemo(
    () => new Map(rawDevices.map((device) => [device.id, device.name])),
    [rawDevices],
  );
  const { activeTransfers, isLoadingRecent, recentTransfers } =
    useTransferActivity(deviceNamesById);

  const handleNativeDropEvent = useCallback(
    async (event: NativeDropZonePayload) => {
      if (event.type !== "drop" || event.paths.length === 0) return;
      if (event.zone?.id !== "home-file-stage") return;

      const entries = await resolveDroppedPaths(event.paths);
      homeRef.current?.addDroppedPaths(entries);
    },
    [],
  );

  const dropState = useNativeDropZones({
    onEvent: handleNativeDropEvent,
  });

  const handleHomeSend = useCallback(
    async (payload: HomeSendPayload) => {
      if (payload.publicShare) {
        const message = "การแชร์ผ่านลิงก์ยังไม่พร้อมใช้งาน";
        toast.info(message);
        throw new Error(message);
      }

      const friendTargets = payload.selectedTargetIds.filter((id) =>
        id.startsWith("friend:"),
      );
      if (friendTargets.length > 0) {
        const message = "การส่งให้เพื่อนยังไม่พร้อมใช้งาน";
        toast.info(message);
        throw new Error(message);
      }

      const deviceIds = payload.selectedTargetIds
        .filter((id) => id.startsWith("device:"))
        .map((id) => id.slice("device:".length))
        .filter(Boolean);

      if (deviceIds.length === 0) {
        throw new Error("กรุณาเลือกอุปกรณ์ที่จะส่งไฟล์ให้");
      }

      if (deviceIds.length > 1) {
        const message = "ตอนนี้ส่งได้ครั้งละ 1 อุปกรณ์";
        toast.info(message);
        throw new Error(message);
      }

      const filePaths = payload.files.map((file) => file.path?.trim() ?? "");
      if (filePaths.some((path) => path.length === 0)) {
        const message = "ยังส่งไฟล์นี้ไม่ได้ เพราะไม่พบ path ของไฟล์ในเครื่อง";
        toast.error(message);
        throw new Error(message);
      }

      await onHomeSendToDevice(filePaths, deviceIds[0]);
    },
    [onHomeSendToDevice, toast],
  );

  return (
    <HomeUI
      ref={homeRef}
      activeTransfers={activeTransfers}
      devices={devices}
      friends={friends}
      isLoadingRecentTransfers={isLoadingRecent}
      recentTransfers={recentTransfers}
      dropState={dropState}
      onViewAllRecentTransfers={() => {
        navigate({ to: "/home/history", viewTransition: true });
      }}
      onResolveAudioPreview={resolveAudioPreview}
      onResolveImagePreview={resolveImagePreview}
      onResolvePdfPreview={resolvePdfPreview}
      onSend={handleHomeSend}
      onResolveTextPreview={resolveTextPreview}
      onResolveVideoPreview={resolveVideoPreview}
    />
  );
}

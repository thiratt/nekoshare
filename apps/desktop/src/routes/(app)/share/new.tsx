import { useCallback, useMemo, useRef } from "react";

import { createFileRoute } from "@tanstack/react-router";
import { stat } from "@tauri-apps/plugin-fs";

import {
  createFileEntry,
  type Device,
  type Friend,
  transformDevices,
  transformFriends,
} from "@workspace/app-ui/components/ui/drop-overlay/index";
import {
  ShareComposer,
  type ShareComposerDroppedPath,
  type ShareComposerHandle,
  type ShareComposerTarget,
} from "@workspace/app-ui/components/ui/share/share-composer";
import { useDevices } from "@workspace/app-ui/hooks/use-devices";
import { useFriends } from "@workspace/app-ui/hooks/use-friends";

import { useNativeDropZones } from "@/hooks/use-native-drop-zones";

export const Route = createFileRoute("/(app)/share/new")({
  component: RouteComponent,
});

function deviceToShareTarget(device: Device): ShareComposerTarget {
  return {
    id: device.id,
    name: device.name,
    type: "device",
    deviceType: device.type,
    isOnline: device.isOnline,
    description: device.isOnline ? "พร้อมรับไฟล์" : "ออฟไลน์",
  };
}

function friendToShareTarget(friend: Friend): ShareComposerTarget {
  return {
    id: friend.id,
    name: friend.name,
    type: "friend",
    avatar: friend.avatar,
    isOnline: friend.status === "online",
    description: friend.status === "online" ? "ออนไลน์" : "ออฟไลน์",
  };
}

function RouteComponent() {
  const composerRef = useRef<ShareComposerHandle | null>(null);
  const { devices: rawDevices } = useDevices();
  const { friends: rawFriends } = useFriends();

  const devices = useMemo(
    () =>
      transformDevices(rawDevices, { excludeCurrentDevice: true }).map(
        deviceToShareTarget,
      ),
    [rawDevices],
  );
  const friends = useMemo(
    () => transformFriends(rawFriends).map(friendToShareTarget),
    [rawFriends],
  );

  const resolveDroppedPaths = useCallback(
    async (paths: string[]): Promise<ShareComposerDroppedPath[]> => {
      const entries = await Promise.all(
        paths.map(async (path) => {
          try {
            const fileStat = await stat(path);
            const fileEntry = createFileEntry(path, fileStat.size);
            return {
              path,
              name: fileEntry.name,
              size: fileEntry.size,
            };
          } catch (error) {
            console.error(`Failed to get stats for ${path}:`, error);
            const fileEntry = createFileEntry(path, 0);
            return {
              path,
              name: fileEntry.name,
              size: fileEntry.size,
            };
          }
        }),
      );

      return entries;
    },
    [],
  );

  const dropState = useNativeDropZones({
    onEvent: async (event) => {
      if (event.type !== "drop" || event.paths.length === 0) return;

      const entries = await resolveDroppedPaths(event.paths);

      if (event.zone?.id === "file-stage") {
        composerRef.current?.addDroppedPaths(entries);
      }
    },
  });

  return (
    <ShareComposer
      ref={composerRef}
      devices={devices}
      friends={friends}
      dropState={dropState}
      backHref="/home"
    />
  );
}

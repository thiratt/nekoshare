import { useMemo } from "react";

import { createFileRoute } from "@tanstack/react-router";

import { ReceivedFilesUI } from "@workspace/app-ui/components/ui/files/index";
import { useDevices } from "@workspace/app-ui/hooks/use-devices";
import type { FilesPageItem } from "@workspace/app-ui/components/ui/files/index";

import { useTransferFiles } from "@/hooks/use-transfer-files";

export const Route = createFileRoute("/(app)/home/files")({
  component: RouteComponent,
});

function RouteComponent() {
  const { devices } = useDevices();
  const deviceNamesById = useMemo(
    () => new Map(devices.map((device) => [device.id, device.name])),
    [devices],
  );
  const {
    error,
    isLoading,
    items,
    markMissing,
    openFile,
    refresh,
    removeFromList,
    removeFromListAndDevice,
    revealFile,
  } = useTransferFiles(deviceNamesById);

  async function runFileAction(
    item: FilesPageItem,
    action: (target: FilesPageItem) => Promise<void>,
  ) {
    try {
      await action(item);
    } catch (actionError) {
      console.error("Transfer file action failed:", actionError);
      markMissing(item);
      throw actionError;
    }
  }

  return (
    <ReceivedFilesUI
      error={error}
      files={items}
      isLoading={isLoading}
      onMissingFile={markMissing}
      onOpenFile={(item) => runFileAction(item, openFile)}
      onRefresh={refresh}
      onRemoveFromDevice={removeFromListAndDevice}
      onRemoveFromList={removeFromList}
      onRevealFile={(item) => runFileAction(item, revealFile)}
    />
  );
}

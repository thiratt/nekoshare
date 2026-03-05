import { useCallback, useEffect, useMemo, useState } from "react";

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { revealItemInDir } from "@tauri-apps/plugin-opener";

import {
  generateStableId,
  HomeUI,
} from "@workspace/app-ui/components/ui/home/index";
import type { FileData, HomeProps } from "@workspace/app-ui/types/home";

import {
  deleteTransferHistoryByFileId,
  listTransferHistory,
} from "@/lib/transfer-history";
import {
  type TransferRecord,
  useTransferRecords,
  useTransferStore,
} from "@/lib/store/transfers";

export const Route = createFileRoute("/home/")({
  component: RouteComponent,
});

const tauriInvoke = invoke as HomeProps["invoke"];

function RouteComponent() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  const transferRecords = useTransferRecords();
  const hydrateTransfers = useTransferStore((state) => state.hydrate);
  const removeTransferByFileId = useTransferStore(
    (state) => state.removeByFileId,
  );
  const removeTransferByPath = useTransferStore((state) => state.removeByPath);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const records = await listTransferHistory();
      hydrateTransfers(records);
    } catch (error) {
      console.error("Failed to load transfer history:", error);
    } finally {
      setIsLoading(false);
    }
  }, [hydrateTransfers]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const resolveLabels = useCallback((record: TransferRecord) => {
    if (record.direction === "send") {
      return {
        fromIsMe: true,
        fromLabel: "ฉัน",
        deviceLabel: record.sourceDeviceName ?? null,
      };
    }

    if (record.sameAccount) {
      return {
        fromIsMe: true,
        fromLabel: "ฉัน",
        deviceLabel: record.sourceDeviceName ?? null,
      };
    }

    return {
      fromIsMe: false,
      fromLabel: record.sourceUserName ?? "Unknown",
      deviceLabel: null,
    };
  }, []);

  const historyData = useMemo<FileData[]>(
    () =>
      transferRecords.map((record) => ({
        stableKey: record.fileId,
        name: record.fileName,
        path: record.filePath,
        size: record.totalBytes,
        isFile: true,
        isDirectory: false,
        createdAt: new Date(record.startedAtMs),
        modifiedAt: new Date(record.updatedAtMs),
        accessedAt: null,
        transfer: {
          status: record.status,
          direction: record.direction,
          progressPercent: record.progressPercent,
          ...resolveLabels(record),
          error: record.error,
          updatedAt: new Date(record.updatedAtMs).toISOString(),
        },
      })),
    [resolveLabels, transferRecords],
  );

  return (
    <HomeUI
      onItemClick={(id) => {
        console.log("Open transfer detail for item id:", id);
        navigate({ to: "/home/transfer-detail" });
      }}
      onItemReveal={async (id) => {
        const file = historyData.find(
          (item) => generateStableId(item.stableKey ?? item.path) === id,
        );

        if (file) {
          try {
            await revealItemInDir(file.path);
          } catch (error) {
            console.error("Failed to reveal file in directory:", error);
          }
        }
      }}
      onItemRemove={async (id, scope = "history") => {
        const file = historyData.find(
          (item) => generateStableId(item.stableKey ?? item.path) === id,
        );

        if (!file) {
          return;
        }

        if (scope === "both") {
          try {
            await invoke("delete_file", { path: file.path });
          } catch (error) {
            console.error("Failed to delete file:", error);
            throw error;
          }
        }

        if (file.stableKey) {
          await deleteTransferHistoryByFileId(file.stableKey);
          removeTransferByFileId(file.stableKey);
          return;
        }

        removeTransferByPath(file.path);
      }}
      onBulkDelete={(ids) => {
        console.log("Bulk delete items with ids:", ids);
      }}
      onRefresh={refresh}
      data={historyData}
      loading={isLoading}
      invoke={tauriInvoke}
    />
  );
}

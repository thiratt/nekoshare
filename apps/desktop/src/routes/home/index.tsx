import { useMemo } from "react";

import { createFileRoute } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { revealItemInDir } from "@tauri-apps/plugin-opener";

import {
  generateStableId,
  HomeUI,
} from "@workspace/app-ui/components/ui/home/index";
import type { FileData, HomeProps } from "@workspace/app-ui/types/home";

import { useWorkspace } from "@/hooks/useWorkspace";
import { useTransferRecords, useTransferStore } from "@/lib/store/transfers";

export const Route = createFileRoute("/home/")({
  component: RouteComponent,
});

const tauriInvoke = invoke as HomeProps["invoke"];

function RouteComponent() {
  const { files, status, refresh } = useWorkspace();
  const transferRecords = useTransferRecords();
  const removeTransferByPath = useTransferStore((state) => state.removeByPath);

  const isLoading = status === "loading";

  const workspacePathSet = useMemo(
    () => new Set(files.map((file) => file.path.trim().toLowerCase())),
    [files],
  );

  const resolveLabels = (record: (typeof transferRecords)[number]) => {
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
  };

  const mergedData = useMemo<FileData[]>(() => {
    const latestByPath = new Map<string, (typeof transferRecords)[number]>();

    for (const record of transferRecords) {
      const key = record.filePath.trim().toLowerCase();
      const existing = latestByPath.get(key);

      if (!existing || record.updatedAtMs > existing.updatedAtMs) {
        latestByPath.set(key, record);
      }
    }

    const workspaceRows: FileData[] = files.map((file) => {
      const key = file.path.trim().toLowerCase();
      const transfer = latestByPath.get(key);

      return {
        ...file,
        transfer: transfer
          ? {
              status: transfer.status,
              progressPercent: transfer.progressPercent,
              ...resolveLabels(transfer),
              error: transfer.error,
              updatedAt: new Date(transfer.updatedAtMs).toISOString(),
            }
          : undefined,
      };
    });

    const existingPaths = new Set(
      workspaceRows.map((file) => file.path.trim().toLowerCase()),
    );

    const transferOnlyRows: FileData[] = transferRecords
      .filter(
        (record) => !existingPaths.has(record.filePath.trim().toLowerCase()),
      )
      .map((record) => ({
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
          progressPercent: record.progressPercent,
          ...resolveLabels(record),
          error: record.error,
          updatedAt: new Date(record.updatedAtMs).toISOString(),
        },
      }));

    return [...workspaceRows, ...transferOnlyRows];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, transferRecords]);

  if (status === "unavailable") {
    return (
      <HomeUI
        onItemClick={() => {}}
        onItemReveal={() => Promise.resolve()}
        onItemRemove={() => Promise.resolve()}
        onBulkDelete={() => {}}
        onRefresh={refresh}
        data={[]}
        loading={false}
        invoke={tauriInvoke}
      />
    );
  }

  return (
    <HomeUI
      onItemClick={(id) => {
        console.log("Clicked item with id:", id);
      }}
      onItemReveal={async (id) => {
        const file = mergedData.find((f) => generateStableId(f.path) === id);
        if (file) {
          await revealItemInDir(file.path);
        }
      }}
      onItemRemove={async (id) => {
        const file = mergedData.find((f) => generateStableId(f.path) === id);
        if (file) {
          const normalizedPath = file.path.trim().toLowerCase();
          if (!workspacePathSet.has(normalizedPath)) {
            removeTransferByPath(file.path);
            return;
          }

          try {
            await invoke("delete_file", { path: file.path });
            await refresh();
          } catch (err) {
            console.error("Failed to delete file:", err);
          }
        }
      }}
      onBulkDelete={(ids) => {
        console.log("Bulk delete items with ids:", ids);
      }}
      onRefresh={refresh}
      data={mergedData}
      loading={isLoading}
      invoke={tauriInvoke}
    />
  );
}

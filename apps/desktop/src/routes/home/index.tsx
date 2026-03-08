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
  type TransferRecord,
  useTransferRecords,
  useTransferStore,
} from "@/lib/store/transfers";
import {
  deleteTransferHistoryByFileId,
  deleteTransferHistoryByTransferId,
  listTransferHistory,
} from "@/lib/transfer-history";

export const Route = createFileRoute("/home/")({
  component: RouteComponent,
});

const tauriInvoke = invoke as HomeProps["invoke"];
const TRANSFER_GROUP_PREFIX = "transfer:";

function getGroupKey(transferId: string): string {
  return `${TRANSFER_GROUP_PREFIX}${transferId}`;
}

function readTransferIdFromGroupKey(stableKey?: string): string | null {
  if (!stableKey?.startsWith(TRANSFER_GROUP_PREFIX)) {
    return null;
  }

  return stableKey.slice(TRANSFER_GROUP_PREFIX.length);
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function resolveGroupedStatus(
  records: TransferRecord[],
): TransferRecord["status"] {
  if (records.some((record) => record.status === "processing")) {
    return "processing";
  }

  if (records.some((record) => record.status === "failed")) {
    return "failed";
  }

  return "success";
}

function resolveGroupedName(
  direction: "send" | "receive",
  status: TransferRecord["status"],
  fileCount: number,
): string {
  if (direction === "receive") {
    if (status === "processing") return `กำลังรับ ${fileCount} ไฟล์`;
    if (status === "failed") return `รับไม่สำเร็จ ${fileCount} ไฟล์`;
    return `ได้รับไฟล์ ${fileCount} ไฟล์`;
  }

  if (status === "processing") return `กำลังส่ง ${fileCount} ไฟล์`;
  if (status === "failed") return `ส่งไม่สำเร็จ ${fileCount} ไฟล์`;
  return `ส่งไฟล์ ${fileCount} ไฟล์`;
}

function RouteComponent() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  const transferRecords = useTransferRecords();
  const hydrateTransfers = useTransferStore((state) => state.hydrate);
  const removeTransferByFileId = useTransferStore(
    (state) => state.removeByFileId,
  );
  const removeTransferByTransferId = useTransferStore(
    (state) => state.removeByTransferId,
  );

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

  const historyData = useMemo<FileData[]>(() => {
    const grouped = new Map<string, TransferRecord[]>();

    for (const record of transferRecords) {
      const bucket = grouped.get(record.transferId);
      if (bucket) {
        bucket.push(record);
      } else {
        grouped.set(record.transferId, [record]);
      }
    }

    const rows: FileData[] = [];

    for (const [transferId, records] of grouped) {
      const ordered = [...records].sort(
        (a, b) => b.updatedAtMs - a.updatedAtMs,
      );

      if (ordered.length === 1) {
        const record = ordered[0];
        rows.push({
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
            transferId: record.transferId,
            direction: record.direction,
            progressPercent: record.progressPercent,
            ...resolveLabels(record),
            error: record.error,
            updatedAt: new Date(record.updatedAtMs).toISOString(),
          },
        });
        continue;
      }

      const representative = ordered[0];
      const status = resolveGroupedStatus(ordered);
      const totalBytes = ordered.reduce(
        (sum, record) => sum + record.totalBytes,
        0,
      );
      const sentBytes = ordered.reduce(
        (sum, record) =>
          sum + Math.max(0, Math.min(record.sentBytes, record.totalBytes)),
        0,
      );
      const progressPercent =
        status === "success"
          ? 100
          : totalBytes > 0
            ? clampPercent((sentBytes / totalBytes) * 100)
            : clampPercent(representative.progressPercent);
      const updatedAtMs = Math.max(
        ...ordered.map((record) => record.updatedAtMs),
      );
      const createdAtMs = Math.min(
        ...ordered.map((record) => record.startedAtMs),
      );
      const error =
        ordered.find(
          (record) => record.status === "failed" && record.error?.length,
        )?.error ?? null;

      rows.push({
        stableKey: getGroupKey(transferId),
        name: resolveGroupedName(
          representative.direction,
          status,
          ordered.length,
        ),
        path: `transfer://${transferId}`,
        size: totalBytes,
        isFile: false,
        isDirectory: false,
        createdAt: new Date(createdAtMs),
        modifiedAt: new Date(updatedAtMs),
        accessedAt: null,
        transfer: {
          status,
          transferId,
          direction: representative.direction,
          progressPercent,
          ...resolveLabels(representative),
          error,
          updatedAt: new Date(updatedAtMs).toISOString(),
        },
      });
    }

    rows.sort(
      (a, b) => (b.modifiedAt?.getTime() ?? 0) - (a.modifiedAt?.getTime() ?? 0),
    );
    return rows;
  }, [resolveLabels, transferRecords]);

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

        if (file?.isFile) {
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

        const groupedTransferId = readTransferIdFromGroupKey(file.stableKey);
        const isOutgoingTransfer = file.transfer?.direction === "send";

        if (groupedTransferId) {
          if (scope === "both" && !isOutgoingTransfer) {
            const transferFiles = transferRecords.filter(
              (record) => record.transferId === groupedTransferId,
            );
            for (const record of transferFiles) {
              try {
                await invoke("delete_file", { path: record.filePath });
              } catch (error) {
                console.error("Failed to delete file:", error);
                throw error;
              }
            }
          }

          await deleteTransferHistoryByTransferId(groupedTransferId);
          removeTransferByTransferId(groupedTransferId);
          return;
        }

        if (scope === "both" && !isOutgoingTransfer) {
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

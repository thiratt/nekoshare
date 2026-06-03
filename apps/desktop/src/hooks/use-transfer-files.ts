import { useCallback, useEffect, useMemo, useState } from "react";

import type { FilesPageItem } from "@workspace/app-ui/components/ui/files/index";

import type { TransferRecord } from "@/lib/store/transfers";
import {
  deleteTransferFile,
  deleteTransferHistoryByFileId,
  listTransferHistory,
  openTransferFile,
  revealTransferFile,
  transferFileExists,
} from "@/lib/transfer-history";

type DeviceNameLookup = Map<string, string>;

function clampProgress(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function toStatus(
  status: TransferRecord["status"],
): FilesPageItem["status"] | null {
  if (status === "success") return "completed";
  if (status === "failed") return "failed";
  return null;
}

function peerNameFor(
  record: TransferRecord,
  deviceNamesById: DeviceNameLookup,
): string | undefined {
  if (record.direction === "receive") {
    return record.sourceDeviceName ?? record.sourceUserName ?? undefined;
  }

  const targetName =
    deviceNamesById.get(record.targetDeviceId) ?? record.targetDeviceId;
  return targetName || undefined;
}

function toFilesPageItem(
  record: TransferRecord,
  deviceNamesById: DeviceNameLookup,
): FilesPageItem | null {
  const status = toStatus(record.status);
  if (!status) return null;

  return {
    id: record.fileId,
    transferId: record.transferId,
    fileId: record.fileId,
    fileName: record.fileName,
    filePath: record.filePath,
    direction: record.direction,
    status,
    availability: "unknown",
    peerName: peerNameFor(record, deviceNamesById),
    size: record.totalBytes,
    transferredBytes:
      record.status === "success"
        ? Math.max(record.sentBytes, record.totalBytes)
        : record.sentBytes,
    progress:
      record.status === "success" ? 100 : clampProgress(record.progressPercent),
    updatedAt: record.updatedAtMs,
    errorMessage: record.error ?? undefined,
  };
}

export function useTransferFiles(
  deviceNamesById: DeviceNameLookup = new Map(),
) {
  const [items, setItems] = useState<FilesPageItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedDeviceNamesById = useMemo(
    () => deviceNamesById,
    [deviceNamesById],
  );

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const records = await listTransferHistory();
      const mapped = records
        .filter((record) => record.direction === "receive")
        .map((record) => toFilesPageItem(record, sortedDeviceNamesById))
        .filter((item): item is FilesPageItem => item !== null)
        .sort((a, b) => b.updatedAt - a.updatedAt);

      setItems(mapped);

      for (const item of mapped) {
        try {
          const exists = await transferFileExists(item.filePath);
          setItems((current) =>
            current.map((currentItem) =>
              currentItem.id === item.id
                ? {
                    ...currentItem,
                    availability: exists ? "available" : "missing",
                  }
                : currentItem,
            ),
          );
        } catch {
          setItems((current) =>
            current.map((currentItem) =>
              currentItem.id === item.id
                ? { ...currentItem, availability: "missing" }
                : currentItem,
            ),
          );
        }
      }
    } catch (loadError) {
      console.error("Failed to load transfer files:", loadError);
      setError("โหลดรายการไฟล์ไม่สำเร็จ");
    } finally {
      setIsLoading(false);
    }
  }, [sortedDeviceNamesById]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const openFile = useCallback(async (item: FilesPageItem) => {
    await openTransferFile(item.filePath);
    setItems((current) =>
      current.map((currentItem) =>
        currentItem.id === item.id
          ? { ...currentItem, availability: "available" }
          : currentItem,
      ),
    );
  }, []);

  const revealFile = useCallback(async (item: FilesPageItem) => {
    await revealTransferFile(item.filePath);
    setItems((current) =>
      current.map((currentItem) =>
        currentItem.id === item.id
          ? { ...currentItem, availability: "available" }
          : currentItem,
      ),
    );
  }, []);

  const removeFromList = useCallback(async (item: FilesPageItem) => {
    await deleteTransferHistoryByFileId(item.fileId);
    setItems((current) =>
      current.filter((currentItem) => currentItem.id !== item.id),
    );
  }, []);

  const removeFromListAndDevice = useCallback(async (item: FilesPageItem) => {
    await deleteTransferFile(item.filePath);
    await deleteTransferHistoryByFileId(item.fileId);
    setItems((current) =>
      current.filter((currentItem) => currentItem.id !== item.id),
    );
  }, []);

  const markMissing = useCallback((item: FilesPageItem) => {
    setItems((current) =>
      current.map((currentItem) =>
        currentItem.id === item.id
          ? { ...currentItem, availability: "missing" }
          : currentItem,
      ),
    );
  }, []);

  return {
    error,
    isLoading,
    items,
    markMissing,
    openFile,
    refresh,
    removeFromList,
    removeFromListAndDevice,
    revealFile,
  };
}

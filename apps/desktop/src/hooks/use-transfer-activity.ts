import { useCallback, useEffect, useMemo, useState } from "react";

import { HOME_RECENT_TRANSFER_LIMIT } from "@workspace/app-ui/components/ui/home/index";
import type {
  HomeActiveTransferItem,
  HomeRecentTransferItem,
} from "@workspace/app-ui/components/ui/home/index";

import type { TransferRecord, TransferStatus } from "@/lib/store/transfers";
import { useTransferRecords } from "@/lib/store/transfers";
import { listTransferHistory } from "@/lib/transfer-history";

const TERMINAL_ACTIVE_VISIBLE_MS = 2500;

type DeviceNameLookup = Map<string, string>;

function clampProgress(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function progressFor(record: TransferRecord): number {
  if (record.status === "success") return 100;
  return clampProgress(record.progressPercent);
}

function transferredBytesFor(record: TransferRecord): number {
  if (record.status === "success")
    return Math.max(record.sentBytes, record.totalBytes);
  return record.sentBytes;
}

function peerNameFor(
  record: TransferRecord,
  deviceNamesById: DeviceNameLookup,
): string | undefined {
  if (record.direction === "receive") {
    return record.sourceDeviceName ?? record.sourceUserName ?? undefined;
  }

  return deviceNamesById.get(record.targetDeviceId) ?? undefined;
}

function mapActiveStatus(
  status: TransferStatus,
): HomeActiveTransferItem["status"] {
  if (status === "success") return "completed";
  if (status === "failed") return "failed";
  return "transferring";
}

function mapRecentStatus(
  status: TransferStatus,
): HomeRecentTransferItem["status"] | null {
  if (status === "success") return "completed";
  if (status === "failed") return "failed";
  return null;
}

function toActiveTransferItem(
  record: TransferRecord,
  deviceNamesById: DeviceNameLookup,
): HomeActiveTransferItem {
  return {
    id: record.fileId || `${record.transferId}:batch`,
    transferId: record.transferId,
    fileId: record.fileId || undefined,
    direction: record.direction,
    status: mapActiveStatus(record.status),
    peerName: peerNameFor(record, deviceNamesById),
    fileName: record.fileName,
    totalBytes: record.totalBytes,
    transferredBytes: transferredBytesFor(record),
    progress: progressFor(record),
    transport: "UNKNOWN",
    errorMessage: record.error ?? undefined,
    startedAt: record.startedAtMs,
    updatedAt: record.updatedAtMs,
  };
}

function toRecentTransferItem(
  record: TransferRecord,
  deviceNamesById: DeviceNameLookup,
): HomeRecentTransferItem | null {
  const status = mapRecentStatus(record.status);
  if (!status) return null;

  return {
    id: record.fileId,
    transferId: record.transferId,
    fileId: record.fileId,
    direction: record.direction,
    status,
    peerName: peerNameFor(record, deviceNamesById),
    fileName: record.fileName,
    totalBytes: record.totalBytes,
    transferredBytes: transferredBytesFor(record),
    progress: progressFor(record),
    errorMessage: record.error ?? undefined,
    updatedAt: record.updatedAtMs,
  };
}

export function useTransferActivity(
  deviceNamesById: DeviceNameLookup = new Map(),
) {
  const records = useTransferRecords();
  const [isLoadingRecent, setIsLoadingRecent] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [recentHistoryRecords, setRecentHistoryRecords] = useState<
    TransferRecord[]
  >([]);
  const [refreshedTerminalIds, setRefreshedTerminalIds] = useState<Set<string>>(
    () => new Set(),
  );

  const refreshRecentTransfers = useCallback(async () => {
    setIsLoadingRecent(true);
    try {
      const historyRecords = await listTransferHistory();
      setRecentHistoryRecords(historyRecords);
    } catch (error) {
      console.error("Failed to load transfer history:", error);
    } finally {
      setIsLoadingRecent(false);
    }
  }, []);

  useEffect(() => {
    void refreshRecentTransfers();
  }, [refreshRecentTransfers]);

  useEffect(() => {
    const hasVisibleTerminalTransfer = records.some(
      (record) =>
        record.status !== "processing" &&
        now - record.updatedAtMs <= TERMINAL_ACTIVE_VISIBLE_MS,
    );

    if (!hasVisibleTerminalTransfer) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 500);

    return () => window.clearInterval(intervalId);
  }, [now, records]);

  useEffect(() => {
    const terminalIds = records
      .filter(
        (record) => record.status === "success" || record.status === "failed",
      )
      .map(
        (record) =>
          `${record.transferId}:${record.fileId}:${record.status}:${record.updatedAtMs}`,
      )
      .filter((id) => !refreshedTerminalIds.has(id));

    if (terminalIds.length === 0) {
      return;
    }

    setRefreshedTerminalIds((current) => {
      const next = new Set(current);
      terminalIds.forEach((id) => next.add(id));
      return next;
    });

    const timeoutId = window.setTimeout(() => {
      void refreshRecentTransfers();
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [records, refreshRecentTransfers, refreshedTerminalIds]);

  const activeTransfers = useMemo(
    () =>
      records
        .filter(
          (record) =>
            record.status === "processing" ||
            now - record.updatedAtMs <= TERMINAL_ACTIVE_VISIBLE_MS,
        )
        .map((record) => toActiveTransferItem(record, deviceNamesById))
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [deviceNamesById, now, records],
  );

  const recentTransfers = useMemo(
    () =>
      recentHistoryRecords
        .map((record) => toRecentTransferItem(record, deviceNamesById))
        .filter((item): item is HomeRecentTransferItem => item !== null)
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, HOME_RECENT_TRANSFER_LIMIT),
    [deviceNamesById, recentHistoryRecords],
  );

  return {
    activeTransfers,
    isLoadingRecent,
    recentTransfers,
    refreshRecentTransfers,
  };
}

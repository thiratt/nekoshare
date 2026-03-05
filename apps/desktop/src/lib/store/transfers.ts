import { create } from "zustand";

export type TransferStatus = "processing" | "success" | "failed";

export interface TransferProgressEvent {
  transferId: string;
  fileId: string;
  filePath: string;
  fileName: string;
  direction: "send" | "receive";
  sourceUserId?: string | null;
  sourceUserName?: string | null;
  sourceDeviceId?: string | null;
  sourceDeviceName?: string | null;
  sameAccount?: boolean | null;
  targetDeviceId: string;
  totalBytes: number;
  sentBytes: number;
  progressPercent: number;
  status: TransferStatus;
  error?: string | null;
  timestampMs: number;
}

export interface TransferRecord {
  transferId: string;
  fileId: string;
  filePath: string;
  fileName: string;
  direction: "send" | "receive";
  sourceUserId: string | null;
  sourceUserName: string | null;
  sourceDeviceId: string | null;
  sourceDeviceName: string | null;
  sameAccount: boolean | null;
  targetDeviceId: string;
  totalBytes: number;
  sentBytes: number;
  progressPercent: number;
  status: TransferStatus;
  error: string | null;
  startedAtMs: number;
  updatedAtMs: number;
}

interface IncomingTransferMeta {
  transferId: string;
  sourceUserId: string | null;
  sourceUserName: string | null;
  sourceDeviceId: string | null;
  sourceDeviceName: string | null;
  sameAccount: boolean | null;
  updatedAtMs: number;
}

interface TransferStoreState {
  records: TransferRecord[];
  incomingMeta: Record<string, IncomingTransferMeta>;
  hydrate: (records: TransferRecord[]) => void;
  upsertFromEvent: (event: TransferProgressEvent) => void;
  registerIncomingMeta: (meta: Omit<IncomingTransferMeta, "updatedAtMs">) => void;
  removeByFileId: (fileId: string) => void;
  removeByPath: (path: string) => void;
  clearOld: (maxAgeMs: number) => void;
}

function clampProgress(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

function normalizePath(path: string): string {
  return path.trim().toLowerCase();
}

export const useTransferStore = create<TransferStoreState>((set) => ({
  records: [],
  incomingMeta: {},

  hydrate: (records) => {
    const sorted = [...records].sort((a, b) => b.updatedAtMs - a.updatedAtMs);
    set({ records: sorted });
  },

  registerIncomingMeta: (meta) => {
    set((state) => ({
      incomingMeta: {
        ...state.incomingMeta,
        [meta.transferId]: { ...meta, updatedAtMs: Date.now() },
      },
    }));
  },

  upsertFromEvent: (event) => {
    set((state) => {
      const incomingMeta = state.incomingMeta[event.transferId];
      const sourceUserId = event.sourceUserId ?? incomingMeta?.sourceUserId ?? null;
      const sourceUserName = event.sourceUserName ?? incomingMeta?.sourceUserName ?? null;
      const sourceDeviceId = event.sourceDeviceId ?? incomingMeta?.sourceDeviceId ?? null;
      const sourceDeviceName = event.sourceDeviceName ?? incomingMeta?.sourceDeviceName ?? null;
      const sameAccount = event.sameAccount ?? incomingMeta?.sameAccount ?? null;

      // Batch-level failure (without a specific file id): mark all processing rows in the same transfer as failed.
      if (!event.fileId) {
        const next = state.records.map((record) => {
          if (
            record.transferId === event.transferId &&
            record.status === "processing"
          ) {
            return {
              ...record,
              status: "failed" as const,
              error: event.error ?? "Transfer failed",
              updatedAtMs: event.timestampMs,
            };
          }
          return record;
        });
        return { records: next };
      }

      const eventPath = normalizePath(event.filePath);
      const recordIndex = state.records.findIndex(
        (record) =>
          record.fileId === event.fileId ||
          normalizePath(record.filePath) === eventPath,
      );

      const progressPercent = clampProgress(event.progressPercent);
      const status = event.status;

      if (recordIndex < 0) {
        const newRecord: TransferRecord = {
          transferId: event.transferId,
          fileId: event.fileId,
          filePath: event.filePath,
          fileName: event.fileName,
          direction: event.direction,
          sourceUserId,
          sourceUserName,
          sourceDeviceId,
          sourceDeviceName,
          sameAccount,
          targetDeviceId: event.targetDeviceId,
          totalBytes: event.totalBytes,
          sentBytes: event.sentBytes,
          progressPercent,
          status,
          error: event.error ?? null,
          startedAtMs: event.timestampMs,
          updatedAtMs: event.timestampMs,
        };

        const next = [newRecord, ...state.records];
        next.sort((a, b) => b.updatedAtMs - a.updatedAtMs);
        return { records: next };
      }

      const existing = state.records[recordIndex];
      const merged: TransferRecord = {
        ...existing,
        transferId: event.transferId || existing.transferId,
        fileId: event.fileId || existing.fileId,
        filePath: event.filePath || existing.filePath,
        fileName: event.fileName || existing.fileName,
        direction: event.direction || existing.direction,
        sourceUserId: sourceUserId ?? existing.sourceUserId,
        sourceUserName: sourceUserName ?? existing.sourceUserName,
        sourceDeviceId: sourceDeviceId ?? existing.sourceDeviceId,
        sourceDeviceName: sourceDeviceName ?? existing.sourceDeviceName,
        sameAccount: sameAccount ?? existing.sameAccount,
        targetDeviceId: event.targetDeviceId || existing.targetDeviceId,
        totalBytes: event.totalBytes || existing.totalBytes,
        sentBytes: event.sentBytes,
        progressPercent,
        status,
        error: event.error ?? null,
        updatedAtMs: event.timestampMs,
      };

      const next = [...state.records];
      next[recordIndex] = merged;
      next.sort((a, b) => b.updatedAtMs - a.updatedAtMs);
      return { records: next };
    });
  },

  removeByFileId: (fileId) => {
    set((state) => ({
      records: state.records.filter((record) => record.fileId !== fileId),
    }));
  },

  removeByPath: (path) => {
    const key = normalizePath(path);
    set((state) => ({
      records: state.records.filter(
        (record) => normalizePath(record.filePath) !== key,
      ),
    }));
  },

  clearOld: (maxAgeMs) => {
    const now = Date.now();
    set((state) => ({
      records: state.records.filter(
        (record) => now - record.updatedAtMs <= maxAgeMs,
      ),
      incomingMeta: Object.fromEntries(
        Object.entries(state.incomingMeta).filter(
          ([, meta]) => now - meta.updatedAtMs <= maxAgeMs,
        ),
      ),
    }));
  },
}));

export function useTransferRecords(): TransferRecord[] {
  return useTransferStore((state) => state.records);
}

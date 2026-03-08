import { invoke } from "@tauri-apps/api/core";

import type {
  TransferProgressEvent,
  TransferRecord,
  TransferStatus,
} from "@/lib/store/transfers";

interface TransferHistoryRecordDto {
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

function toTransferRecord(row: TransferHistoryRecordDto): TransferRecord {
  return {
    transferId: row.transferId,
    fileId: row.fileId,
    filePath: row.filePath,
    fileName: row.fileName,
    direction: row.direction,
    sourceUserId: row.sourceUserId,
    sourceUserName: row.sourceUserName,
    sourceDeviceId: row.sourceDeviceId,
    sourceDeviceName: row.sourceDeviceName,
    sameAccount: row.sameAccount,
    targetDeviceId: row.targetDeviceId,
    totalBytes: row.totalBytes,
    sentBytes: row.sentBytes,
    progressPercent: row.progressPercent,
    status: row.status,
    error: row.error,
    startedAtMs: row.startedAtMs,
    updatedAtMs: row.updatedAtMs,
  };
}

function clampProgress(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

export async function listTransferHistory(limit = 500): Promise<TransferRecord[]> {
  const rows = await invoke<TransferHistoryRecordDto[]>("transfer_history_list", {
    limit,
  });
  return rows.map(toTransferRecord);
}

export async function deleteTransferHistoryByFileId(fileId: string): Promise<void> {
  await invoke("transfer_history_delete", { fileId });
}

export async function deleteTransferHistoryByTransferId(
  transferId: string,
): Promise<void> {
  await invoke("transfer_history_delete_transfer", { transferId });
}

export function eventToTransferRecord(event: TransferProgressEvent): TransferRecord {
  return {
    transferId: event.transferId,
    fileId: event.fileId,
    filePath: event.filePath,
    fileName: event.fileName,
    direction: event.direction,
    sourceUserId: event.sourceUserId ?? null,
    sourceUserName: event.sourceUserName ?? null,
    sourceDeviceId: event.sourceDeviceId ?? null,
    sourceDeviceName: event.sourceDeviceName ?? null,
    sameAccount: event.sameAccount ?? null,
    targetDeviceId: event.targetDeviceId,
    totalBytes: event.totalBytes,
    sentBytes: event.sentBytes,
    progressPercent: clampProgress(event.progressPercent),
    status: event.status,
    error: event.error ?? null,
    startedAtMs: event.timestampMs,
    updatedAtMs: event.timestampMs,
  };
}

import { useCallback, useEffect, useState } from "react";

import type {
  FileData,
  HomeProps,
  ShareItem,
  Status,
} from "@workspace/app-ui/types/home";

import { formatFileSize, getFileType } from "./constants";

interface UseShareDataProps {
  data: FileData[];
  externalLoading?: boolean;
  onRefresh?: HomeProps["onRefresh"];
}

interface UseShareDataReturn {
  items: ShareItem[];
  loading: boolean;
  refreshData: () => void;
  setItems: React.Dispatch<React.SetStateAction<ShareItem[]>>;
}

export function generateStableId(path: string): number {
  let hash = 0;
  for (let i = 0; i < path.length; i++) {
    const char = path.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash &= hash;
  }

  return Math.abs(hash);
}

function resolveTransferStatusLabel(
  transferFileCount: number,
  direction: "send" | "receive" | undefined,
  status: Status,
  progressPercent?: number,
): string | undefined {
  const roundedProgress =
    typeof progressPercent === "number" && Number.isFinite(progressPercent)
      ? Math.max(0, Math.min(100, Math.round(progressPercent)))
      : null;

  if (status === "processing") {
    if (transferFileCount > 1) {
      if (direction === "receive") {
        return `กำลังรับ ${transferFileCount} ไฟล์`;
      }
      if (direction === "send") {
        return `กำลังส่ง ${transferFileCount} ไฟล์`;
      }
    }
    return `${roundedProgress ?? 0}%`;
  }

  void direction;
  return undefined;
}

export function useShareData({
  data,
  externalLoading,
  onRefresh,
}: UseShareDataProps): UseShareDataReturn {
  const [items, setItems] = useState<ShareItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (externalLoading) {
      setLoading(true);
      return;
    }

    const transferCountMap = new Map<string, number>();
    for (const item of data) {
      const transferId = item.transfer?.transferId;
      if (!transferId || transferId.length === 0) continue;
      transferCountMap.set(transferId, (transferCountMap.get(transferId) ?? 0) + 1);
    }

    const transformedItems: ShareItem[] = data.map((file) => {
      const transferStatus: Status = file.transfer?.status ?? "success";
      const progressPercent = file.transfer?.progressPercent;
      const transferId = file.transfer?.transferId;
      const transferFileCount =
        transferId && transferId.length > 0
          ? (transferCountMap.get(transferId) ?? 1)
          : 1;
      const uploadedAtDate = file.modifiedAt || file.createdAt || new Date();
      const uploadedAt =
        uploadedAtDate instanceof Date
          ? uploadedAtDate.toISOString()
          : new Date().toISOString();
      const fromIsMe = file.transfer?.fromIsMe ?? true;
      const statusLabel = resolveTransferStatusLabel(
        transferFileCount,
        file.transfer?.direction,
        transferStatus,
        progressPercent,
      );

      return {
        id: generateStableId(file.stableKey ?? file.path),
        name: file.name,
        direction: file.transfer?.direction,
        from: fromIsMe ? "me" : "buddy",
        device: file.transfer?.deviceLabel ?? null,
        friendName: fromIsMe ? undefined : file.transfer?.fromLabel,
        status: transferStatus,
        statusLabel,
        uploadedAt,
        isReaded: true,
        canDownload: file.isFile,
        size: formatFileSize(file.size),
        type: file.isDirectory ? "folder" : getFileType(file.name),
        progressPercent,
        error: file.transfer?.error ?? null,
      };
    });

    setItems(transformedItems);
    setLoading(false);
  }, [data, externalLoading]);

  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      await onRefresh?.();
    } finally {
      setLoading(false);
    }
  }, [onRefresh]);

  return { items, loading, refreshData, setItems };
}

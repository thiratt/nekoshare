export type HistoryStatus = "success" | "failed" | "processing";

export interface HistoryTransferSnapshot {
  status: HistoryStatus;
  transferId?: string;
  direction?: "send" | "receive";
  progressPercent?: number;
  fromIsMe?: boolean;
  fromLabel?: string;
  deviceLabel?: string | null;
  statusLabel?: string;
  error?: string | null;
  updatedAt?: string;
}

export interface HistoryFileData {
  stableKey?: string;
  name: string;
  path: string;
  size: number;
  isFile: boolean;
  isDirectory: boolean;
  createdAt: Date | null;
  modifiedAt: Date | null;
  accessedAt: Date | null;
  transfer?: HistoryTransferSnapshot;
}

export type HistoryInvokeFunction = <T>(
  cmd: string,
  args?: Record<string, unknown>,
) => Promise<T>;
export type HistoryDeleteScope = "history" | "both";

export interface HistoryProps {
  onItemClick: (id: number) => void;
  onItemReveal: (id: number) => void;
  onItemRemove: (id: number, scope?: HistoryDeleteScope) => Promise<void>;
  onBulkDelete: (ids: number[]) => void;
  onTransferDetails?: (id: string) => void;
  onRefresh?: () => Promise<void> | void;
  data: HistoryFileData[];
  loading?: boolean;
  invoke?: HistoryInvokeFunction;
}

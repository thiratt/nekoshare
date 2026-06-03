import { useEffect, useMemo, useRef, useState } from "react";

import { createFileRoute, Link } from "@tanstack/react-router";
import { revealItemInDir } from "@tauri-apps/plugin-opener";

import {
  mockActiveTransfers,
  tickActiveTransfers,
  TRANSFER_TICK_MS,
} from "@workspace/app-ui/components/ui/history/data/transfer-demo";
import { type ActiveTransferView } from "@workspace/app-ui/components/ui/history/index";
import {
  type ShareDetailData,
  type ShareDetailFileStatus,
  type ShareDetailState,
  ShareDetailUI,
} from "@workspace/app-ui/components/ui/share/share-detail";

import {
  type TransferRecord,
  useTransferRecords,
  useTransferStore,
} from "@/lib/store/transfers";
import { listTransferHistory } from "@/lib/transfer-history";

type FileActionOverride = {
  status: ShareDetailFileStatus;
  transferredBytes?: number;
  progress?: number;
};

export const Route = createFileRoute("/(app)/share/$id")({
  component: RouteComponent,
});

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function resolveStatus(records: TransferRecord[]): ShareDetailData["status"] {
  if (records.some((record) => record.status === "processing")) {
    return "sending";
  }

  if (records.some((record) => record.status === "failed")) {
    return "failed";
  }

  return "completed";
}

function resolveActions(state: ShareDetailState): ShareDetailData["actions"] {
  return {
    canPause:
      state === "sending" || state === "transferring" || state === "recovering",
    canResume: state === "paused",
    canCancel:
      state === "queued" ||
      state === "connecting" ||
      state === "handshaking" ||
      state === "sending" ||
      state === "transferring" ||
      state === "paused" ||
      state === "recovering" ||
      state === "failed",
    canRetry:
      state === "failed" || state === "cancelled" || state === "skipped",
    canOpenFolder:
      state === "completed" || state === "failed" || state === "cancelled",
  };
}

function transferStateToDetailState(
  state: ActiveTransferView["state"],
): ShareDetailState {
  switch (state) {
    case "queued":
      return "connecting";
    case "transferring":
      return "sending";
    case "skipped":
      return "cancelled";
    default:
      return state;
  }
}

function detailStateToStatus(
  state: ShareDetailState,
): ShareDetailData["status"] {
  if (state === "completed") return "completed";
  if (state === "failed" || state === "cancelled") return "failed";
  return "sending";
}

function fileStatusToDetailState(
  status: ShareDetailFileStatus,
): ShareDetailState {
  switch (status) {
    case "queued":
      return "connecting";
    case "transferring":
    case "sending":
      return "sending";
    case "paused":
      return "paused";
    case "verifying":
      return "verifying";
    case "completed":
      return "completed";
    case "failed":
      return "failed";
    case "cancelled":
      return "cancelled";
    case "skipped":
      return "skipped";
  }
}

function stateLabel(state: ShareDetailState): string {
  switch (state) {
    case "queued":
      return "รอคิว";
    case "connecting":
      return "กำลังเชื่อมต่อ";
    case "handshaking":
      return "กำลังยืนยันปลายทาง";
    case "transferring":
    case "sending":
      return "กำลังส่ง";
    case "paused":
      return "หยุดชั่วคราว";
    case "recovering":
      return "กำลังกู้การเชื่อมต่อ";
    case "verifying":
      return "กำลังตรวจสอบไฟล์";
    case "completed":
      return "เสร็จแล้ว";
    case "failed":
      return "ล้มเหลว";
    case "cancelled":
      return "ยกเลิกแล้ว";
    case "skipped":
      return "ข้ามแล้ว";
    case "disconnected":
      return "หลุดการเชื่อมต่อ";
  }
}

function pathLabel(
  target: ActiveTransferView["targets"][number] | undefined,
): string {
  if (!target) return "ยังไม่ทราบ";

  switch (target.route.type) {
    case "lan":
      return `LAN · ${target.route.protocol}`;
    case "direct":
      return `Direct · ${target.route.protocol}`;
    case "relay":
      return `Relay · ${target.route.protocol}`;
    case "unknown":
      return `ยังไม่ทราบ · ${target.route.protocol}`;
  }
}

function resolveRecipientStatus(
  records: TransferRecord[],
): ShareDetailData["status"] {
  if (records.some((record) => record.status === "processing")) {
    return "sending";
  }

  if (records.every((record) => record.status === "success")) {
    return "completed";
  }

  return "failed";
}

function recordRecipientKey(record: TransferRecord): string {
  if (record.direction === "receive") {
    return record.sourceDeviceId ?? record.sourceUserId ?? record.transferId;
  }

  return record.targetDeviceId || record.transferId;
}

function recordRecipientName(record: TransferRecord): string {
  if (record.direction === "receive") {
    return record.sourceDeviceName ?? record.sourceUserName ?? "ผู้ส่ง";
  }

  return record.targetDeviceId
    ? `อุปกรณ์ ${record.targetDeviceId.slice(0, 8)}`
    : "ผู้รับ";
}

function recordsToDetail(
  transferId: string,
  records: TransferRecord[],
): ShareDetailData | null {
  const transferRecords = records.filter(
    (record) => record.transferId === transferId,
  );
  if (transferRecords.length === 0) return null;

  const ordered = [...transferRecords].sort(
    (a, b) => a.startedAtMs - b.startedAtMs,
  );
  const latest = [...transferRecords].sort(
    (a, b) => b.updatedAtMs - a.updatedAtMs,
  )[0];
  const status = resolveStatus(transferRecords);
  const state: ShareDetailState =
    status === "completed"
      ? "completed"
      : status === "failed"
        ? "failed"
        : "sending";
  const totalBytes = transferRecords.reduce(
    (sum, record) => sum + record.totalBytes,
    0,
  );
  const transferredBytes = transferRecords.reduce(
    (sum, record) =>
      sum + Math.max(0, Math.min(record.sentBytes, record.totalBytes)),
    0,
  );
  const progress =
    status === "completed"
      ? 100
      : totalBytes > 0
        ? clampPercent((transferredBytes / totalBytes) * 100)
        : 0;
  const direction = latest.direction;
  const groupedRecipients = new Map<string, TransferRecord[]>();

  for (const record of transferRecords) {
    const key = recordRecipientKey(record);
    const current = groupedRecipients.get(key);
    if (current) {
      current.push(record);
    } else {
      groupedRecipients.set(key, [record]);
    }
  }

  const title =
    transferRecords.length === 1
      ? transferRecords[0].fileName
      : direction === "send"
        ? `ส่งไฟล์ ${transferRecords.length} ไฟล์`
        : `รับไฟล์ ${transferRecords.length} ไฟล์`;

  return {
    id: transferId,
    title,
    subtitle:
      direction === "send" ? "รายละเอียดการส่งไฟล์" : "รายละเอียดการรับไฟล์",
    direction,
    status,
    state,
    stateLabel: stateLabel(state),
    progress,
    totalBytes,
    transferredBytes,
    encrypted: null,
    actions: resolveActions(state),
    startedAt: new Date(
      Math.min(...ordered.map((record) => record.startedAtMs)),
    ),
    updatedAt: new Date(
      Math.max(...ordered.map((record) => record.updatedAtMs)),
    ),
    recipients: Array.from(groupedRecipients.entries()).map(
      ([recipientId, recipientRecords]) => {
        const representative = recipientRecords[0];
        return {
          id: recipientId,
          name: recordRecipientName(representative),
          description:
            representative.direction === "receive" &&
            representative.sourceUserName
              ? representative.sourceUserName
              : null,
          status: resolveRecipientStatus(recipientRecords),
          state:
            resolveRecipientStatus(recipientRecords) === "completed"
              ? "completed"
              : resolveRecipientStatus(recipientRecords) === "failed"
                ? "failed"
                : "sending",
          actions: resolveActions(
            resolveRecipientStatus(recipientRecords) === "completed"
              ? "completed"
              : resolveRecipientStatus(recipientRecords) === "failed"
                ? "failed"
                : "sending",
          ),
          files: recipientRecords.map((record) => ({
            id: record.fileId,
            name: record.fileName,
            size: record.totalBytes,
            transferredBytes: record.sentBytes,
            progress: clampPercent(record.progressPercent),
            status:
              record.status === "success"
                ? "completed"
                : record.status === "failed"
                  ? "failed"
                  : "sending",
            error: record.error,
            actions: resolveActions(
              record.status === "success"
                ? "completed"
                : record.status === "failed"
                  ? "failed"
                  : "sending",
            ),
          })),
        };
      },
    ),
  };
}

function mockTransferToDetail(transfer: ActiveTransferView): ShareDetailData {
  const progress =
    transfer.totalBytes > 0
      ? clampPercent((transfer.transferredBytes / transfer.totalBytes) * 100)
      : 0;
  const state = transferStateToDetailState(transfer.state);
  const status = detailStateToStatus(state);
  const targets = transfer.targets;
  const primaryTarget = targets[0];
  const fileCount = Math.min(Math.max(transfer.fileCount, 1), 6);

  const buildFiles = (target: ActiveTransferView["targets"][number]) =>
    Array.from({ length: fileCount }, (_, index) => {
      const fileSize = Math.round(target.totalBytes / fileCount);
      const fileStart = fileSize * index;
      const fileTransferredBytes = Math.max(
        0,
        Math.min(fileSize, Math.round(target.transferredBytes - fileStart)),
      );
      const fileProgress =
        fileSize > 0
          ? clampPercent((fileTransferredBytes / fileSize) * 100)
          : 0;
      const isStarted = fileTransferredBytes > 0;
      const isCompleted = fileTransferredBytes >= fileSize;
      const isLast = index === fileCount - 1;
      const isRecipientFilePaused =
        transfer.id === "tr_001" && target.id === "max-laptop" && index === 1;
      const fileStatus: ShareDetailFileStatus = (() => {
        if (target.state === "completed") return "completed";
        if (target.state === "verifying" && isLast) return "verifying";
        if (isCompleted) return "completed";
        if (target.state === "failed" && isStarted) return "failed";
        if (target.state === "cancelled" && isStarted) return "cancelled";
        if ((target.state === "paused" || isRecipientFilePaused) && isStarted)
          return "paused";
        if (target.state === "transferring" && isStarted) return "transferring";
        return "queued";
      })();

      return {
        id: `${transfer.id}-file-${index + 1}`,
        name:
          fileCount === 1
            ? transfer.title
            : `${transfer.title.replace(/\.[^/.]+$/, "")}-${String(index + 1).padStart(2, "0")}${
                index % 3 === 0 ? ".zip" : index % 3 === 1 ? ".png" : ".pdf"
              }`,
        size: fileSize,
        transferredBytes: fileTransferredBytes,
        progress: fileProgress,
        status: fileStatus,
        error:
          fileStatus === "failed"
            ? (transfer.error?.message ?? "ส่งไฟล์ไม่สำเร็จ")
            : null,
        actions: resolveActions(fileStatusToDetailState(fileStatus)),
      };
    });

  return {
    id: transfer.id,
    title: transfer.title,
    subtitle:
      transfer.direction === "send"
        ? `ส่งไปยัง ${targets.length > 1 ? `${targets[0]?.name ?? "ผู้รับ"} + ${targets.length - 1}` : (targets[0]?.name ?? "ผู้รับ")}`
        : `รับจาก ${targets[0]?.name ?? "ผู้ส่ง"}`,
    direction: transfer.direction,
    status,
    state,
    stateLabel: stateLabel(state),
    pathLabel: pathLabel(primaryTarget),
    progress,
    totalBytes: transfer.totalBytes,
    transferredBytes: transfer.transferredBytes,
    encrypted: transfer.encrypted,
    actions: resolveActions(state),
    startedAt: null,
    updatedAt: null,
    recipients: targets.map((target) => {
      const recipientState = transferStateToDetailState(target.state);
      return {
        id: target.id,
        name: target.name,
        description: target.deviceName ?? null,
        route: target.route,
        status: detailStateToStatus(recipientState),
        state: recipientState,
        actions: resolveActions(recipientState),
        files: buildFiles(target),
      };
    }),
  };
}

function fileOverrideKey(
  transferId: string,
  recipientId: string,
  fileId: string,
) {
  return `${transferId}:${recipientId}:${fileId}`;
}

function applyFileActionOverrides(
  transferId: string,
  data: ShareDetailData,
  overrides: Record<string, FileActionOverride>,
): ShareDetailData {
  return {
    ...data,
    recipients: data.recipients.map((recipient) => ({
      ...recipient,
      files: recipient.files.map((file) => {
        const override =
          overrides[fileOverrideKey(transferId, recipient.id, file.id)];
        if (!override) return file;

        return {
          ...file,
          status: override.status,
          transferredBytes: override.transferredBytes ?? file.transferredBytes,
          progress:
            override.progress ??
            (override.status === "completed" ? 100 : file.progress),
          error:
            override.status === "cancelled"
              ? "ยกเลิก"
              : override.status === "failed"
                ? (file.error ?? "ส่งไฟล์ไม่สำเร็จ")
                : null,
          actions: resolveActions(fileStatusToDetailState(override.status)),
        };
      }),
    })),
  };
}

function aggregateActiveTransferView(
  transfer: ActiveTransferView,
): ActiveTransferView {
  const transferredBytes = transfer.targets.reduce(
    (sum, target) =>
      sum + Math.max(0, Math.min(target.transferredBytes, target.totalBytes)),
    0,
  );
  const totalBytes = transfer.targets.reduce(
    (sum, target) => sum + target.totalBytes,
    0,
  );
  const speedBps = transfer.targets.reduce(
    (sum, target) => sum + (target.speedBps ?? 0),
    0,
  );

  return {
    ...transfer,
    state: getMockStateFromTargets(transfer.targets, transfer.state),
    transferredBytes,
    totalBytes,
    speedBps: speedBps > 0 ? speedBps : undefined,
    etaSeconds:
      speedBps > 0
        ? Math.ceil(Math.max(0, totalBytes - transferredBytes) / speedBps)
        : undefined,
    error:
      transfer.error ?? transfer.targets.find((target) => target.error)?.error,
  };
}

function getMockStateFromTargets(
  targets: ActiveTransferView["targets"],
  fallback: ActiveTransferView["state"],
): ActiveTransferView["state"] {
  if (targets.length === 0) return fallback;

  const states = targets.map((target) => target.state);
  if (states.every((state) => state === "completed" || state === "skipped"))
    return "completed";
  if (states.every((state) => state === "cancelled")) return "cancelled";
  if (states.some((state) => state === "transferring")) return "transferring";
  if (states.some((state) => state === "verifying")) return "verifying";
  if (states.some((state) => state === "paused")) return "paused";
  if (states.some((state) => state === "queued")) return "queued";
  if (states.some((state) => state === "failed")) return "failed";
  return fallback;
}

function mockSpeedBps(
  routeType: ActiveTransferView["targets"][number]["route"]["type"],
) {
  if (routeType === "lan" || routeType === "direct") return 72 * 1024 * 1024;
  if (routeType === "relay") return 24 * 1024 * 1024;
  return 12 * 1024 * 1024;
}

function isTerminalMockState(state: ActiveTransferView["state"]) {
  return (
    state === "completed" ||
    state === "failed" ||
    state === "cancelled" ||
    state === "skipped"
  );
}

function RouteComponent() {
  const { id } = Route.useParams();
  const loadedHistoryForIdRef = useRef<string | null>(null);
  const [mockTransfers, setMockTransfers] = useState(() => mockActiveTransfers);
  const [fileActionOverrides, setFileActionOverrides] = useState<
    Record<string, FileActionOverride>
  >({});
  const transferRecords = useTransferRecords();
  const hydrateTransfers = useTransferStore((state) => state.hydrate);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setMockTransfers(tickActiveTransfers);
    }, TRANSFER_TICK_MS);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (transferRecords.some((record) => record.transferId === id)) return;
    if (loadedHistoryForIdRef.current === id) return;

    loadedHistoryForIdRef.current = id;

    void listTransferHistory()
      .then(hydrateTransfers)
      .catch((error) => {
        console.error("Failed to load transfer detail:", error);
      });
  }, [hydrateTransfers, id, transferRecords]);

  const detail = useMemo(() => {
    const recordDetail = recordsToDetail(id, transferRecords);
    if (recordDetail)
      return applyFileActionOverrides(id, recordDetail, fileActionOverrides);

    const mockTransfer = mockTransfers.find((transfer) => transfer.id === id);
    const mockDetail = mockTransfer ? mockTransferToDetail(mockTransfer) : null;
    return mockDetail
      ? applyFileActionOverrides(id, mockDetail, fileActionOverrides)
      : null;
  }, [fileActionOverrides, id, mockTransfers, transferRecords]);

  const setFileStatus = (
    recipientId: string,
    fileId: string,
    status: ShareDetailFileStatus,
  ) => {
    const currentFile = detail?.recipients
      .find((recipient) => recipient.id === recipientId)
      ?.files.find((file) => file.id === fileId);
    const key = fileOverrideKey(id, recipientId, fileId);

    setFileActionOverrides((current) => {
      if (status === "sending" || status === "transferring") {
        const { [key]: _removed, ...rest } = current;
        return rest;
      }

      return {
        ...current,
        [key]: {
          status,
          transferredBytes:
            status === "paused" || status === "cancelled" || status === "failed"
              ? currentFile?.transferredBytes
              : undefined,
          progress:
            status === "paused" || status === "cancelled" || status === "failed"
              ? currentFile?.progress
              : undefined,
        },
      };
    });
  };

  const updateMockTransfer = (
    updater: (transfer: ActiveTransferView) => ActiveTransferView,
  ) => {
    setMockTransfers((current) =>
      current.map((transfer) =>
        transfer.id === id
          ? aggregateActiveTransferView(updater(transfer))
          : transfer,
      ),
    );
  };

  const pauseMockTargets = (recipientId?: string) => {
    updateMockTransfer((transfer) => ({
      ...transfer,
      targets: transfer.targets.map((target) =>
        (!recipientId || target.id === recipientId) &&
        target.state === "transferring"
          ? { ...target, state: "paused", speedBps: 0, etaSeconds: undefined }
          : target,
      ),
    }));
  };

  const resumeMockTargets = (recipientId?: string) => {
    updateMockTransfer((transfer) => ({
      ...transfer,
      error: undefined,
      targets: transfer.targets.map((target) => {
        if (
          (!recipientId || target.id === recipientId) &&
          target.state === "paused"
        ) {
          const speedBps = mockSpeedBps(target.route.type);
          return {
            ...target,
            state: "transferring",
            connectionState: "connected",
            speedBps,
            etaSeconds: Math.ceil(
              (target.totalBytes - target.transferredBytes) / speedBps,
            ),
            error: undefined,
          };
        }

        return target;
      }),
    }));
  };

  const retryMockTargets = (recipientId?: string) => {
    updateMockTransfer((transfer) => ({
      ...transfer,
      error: undefined,
      targets: transfer.targets.map((target) => {
        if (
          (!recipientId || target.id === recipientId) &&
          (target.state === "failed" || target.state === "cancelled")
        ) {
          const speedBps = mockSpeedBps(target.route.type);
          return {
            ...target,
            state: "transferring",
            connectionState: "connected",
            speedBps,
            etaSeconds: Math.ceil(
              (target.totalBytes - target.transferredBytes) / speedBps,
            ),
            error: undefined,
          };
        }

        return target;
      }),
    }));
  };

  const cancelMockTargets = (recipientId?: string) => {
    updateMockTransfer((transfer) => ({
      ...transfer,
      error: {
        code: "cancelled",
        message: "Transfer cancelled.",
        retryable: true,
      },
      targets: transfer.targets.map((target) =>
        (!recipientId || target.id === recipientId) &&
        !isTerminalMockState(target.state)
          ? {
              ...target,
              state: "cancelled",
              connectionState: "disconnected",
              speedBps: 0,
              etaSeconds: undefined,
              error: {
                code: "cancelled",
                message: "Transfer cancelled.",
                retryable: true,
              },
            }
          : target,
      ),
    }));
  };

  return (
    <ShareDetailUI
      data={detail}
      backHref="/home"
      linkComponent={Link}
      onCopyId={(transferId) => {
        void window.navigator.clipboard.writeText(transferId);
      }}
      onOpenFolder={() => {
        const firstRecord = transferRecords.find(
          (record) => record.transferId === id,
        );
        if (firstRecord) {
          void revealItemInDir(firstRecord.filePath);
        }
      }}
      onPause={() => {
        pauseMockTargets();
      }}
      onResume={() => {
        resumeMockTargets();
      }}
      onRetry={() => {
        retryMockTargets();
      }}
      onCancel={() => {
        cancelMockTargets();
      }}
      onPauseRecipient={(recipientId) => {
        pauseMockTargets(recipientId);
      }}
      onResumeRecipient={(recipientId) => {
        resumeMockTargets(recipientId);
      }}
      onRetryRecipient={(recipientId) => {
        retryMockTargets(recipientId);
      }}
      onCancelRecipient={(recipientId) => {
        cancelMockTargets(recipientId);
      }}
      onPauseFile={(recipientId, fileId) => {
        setFileStatus(recipientId, fileId, "paused");
      }}
      onResumeFile={(recipientId, fileId) => {
        setFileStatus(recipientId, fileId, "sending");
      }}
      onRetryFile={(recipientId, fileId) => {
        setFileStatus(recipientId, fileId, "sending");
      }}
      onCancelFile={(recipientId, fileId) => {
        setFileStatus(recipientId, fileId, "cancelled");
      }}
    />
  );
}

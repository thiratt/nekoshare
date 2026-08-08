import { useEffect, useMemo, useState } from "react";

import { createFileRoute, useNavigate } from "@tanstack/react-router";

import {
  HomeUI,
  type TransferItem,
} from "@workspace/app-ui/components/ui/home/index";
import { useDevices } from "@workspace/app-ui/hooks/use-devices";

import {
  type TransferRecord,
  useTransferRecords,
  useTransferStore,
} from "@/lib/store/transfers";
import { listTransferHistory } from "@/lib/transfer-history";

export const Route = createFileRoute("/(app)/home/")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const records = useTransferRecords();
  const [loading, setLoading] = useState(true);
  const hydrateTransfers = useTransferStore((state) => state.hydrate);
  const { devices } = useDevices();
  const deviceNamesById = useMemo(
    () => new Map(devices.map((device) => [device.id, device.name])),
    [devices],
  );

  useEffect(() => {
    let active = true;

    void listTransferHistory()
      .then((history) => {
        if (active) hydrateTransfers(history);
      })
      .catch((error) => {
        console.error("Failed to load transfer center history:", error);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [hydrateTransfers]);

  const transfers = useMemo(
    () => buildTransferItems(records, deviceNamesById),
    [deviceNamesById, records],
  );

  return (
    <HomeUI
      transfers={transfers}
      loading={loading}
      onQuickSend={() => {
        navigate({ to: "/share/new", viewTransition: true });
      }}
    />
  );
}

function buildTransferItems(
  records: TransferRecord[],
  deviceNamesById: Map<string, string>,
): TransferItem[] {
  const grouped = new Map<string, TransferRecord[]>();

  for (const record of records) {
    const group = grouped.get(record.transferId);
    if (group) group.push(record);
    else grouped.set(record.transferId, [record]);
  }

  return Array.from(grouped.entries())
    .map(([transferId, rows]) => {
      const ordered = [...rows].sort((a, b) => b.updatedAtMs - a.updatedAtMs);
      const representative = ordered[0];
      const totalBytes = ordered.reduce((sum, row) => sum + row.totalBytes, 0);
      const transferredBytes = ordered.reduce(
        (sum, row) =>
          sum + Math.max(0, Math.min(row.sentBytes, row.totalBytes)),
        0,
      );
      const hasProcessing = ordered.some((row) => row.status === "processing");
      const hasFailed = ordered.some((row) => row.status === "failed");
      const direction =
        representative.direction === "send" ? "outgoing" : "incoming";
      const peerName =
        representative.direction === "send"
          ? (deviceNamesById.get(representative.targetDeviceId) ??
            "Unknown device")
          : (representative.sourceDeviceName ??
            representative.sourceUserName ??
            "Unknown device");

      return {
        id: transferId,
        name:
          ordered.length === 1
            ? representative.fileName
            : `${representative.fileName} +${ordered.length - 1}`,
        peerName,
        direction,
        status: hasProcessing
          ? "transferring"
          : hasFailed
            ? "failed"
            : "completed",
        progress:
          totalBytes > 0
            ? Math.max(0, Math.min(100, (transferredBytes / totalBytes) * 100))
            : representative.progressPercent,
        transferredBytes,
        totalBytes,
        speedBytesPerSecond: undefined,
        updatedAt: Math.max(...ordered.map((row) => row.updatedAtMs)),
        fileCount: ordered.length,
      } satisfies TransferItem;
    })
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

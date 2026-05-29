import { useCallback, useEffect, useMemo, useState } from "react";

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { revealItemInDir } from "@tauri-apps/plugin-opener";

import { HistoryUI } from "@workspace/app-ui/components/ui/history/index";
import type { HistoryProps } from "@workspace/app-ui/types/history";

import { buildHistoryData, findHistoryItemById, readTransferIdFromGroupKey } from "./history-data";

import { useTransferRecords, useTransferStore } from "@/lib/store/transfers";
import {
	deleteTransferHistoryByFileId,
	deleteTransferHistoryByTransferId,
	listTransferHistory,
} from "@/lib/transfer-history";

export const Route = createFileRoute("/(app)/home/history")({
	component: RouteComponent,
});

const tauriInvoke = invoke as HistoryProps["invoke"];

function RouteComponent() {
	const navigate = useNavigate();
	const [isRefreshing, setIsRefreshing] = useState(false);
	const transferRecords = useTransferRecords();
	const hydrateTransfers = useTransferStore((state) => state.hydrate);
	const removeTransferByFileId = useTransferStore((state) => state.removeByFileId);
	const removeTransferByTransferId = useTransferStore((state) => state.removeByTransferId);

	const refresh = useCallback(async () => {
		setIsRefreshing(true);
		try {
			const records = await listTransferHistory();
			hydrateTransfers(records);
		} catch (error) {
			console.error("Failed to load transfer history:", error);
		} finally {
			setIsRefreshing(false);
		}
	}, [hydrateTransfers]);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	const historyData = useMemo(() => buildHistoryData(transferRecords), [transferRecords]);

	const navigateToTransfer = useCallback(
		(transferId: string) => {
			navigate({
				to: "/share/$id",
				params: { id: transferId },
				viewTransition: true,
			});
		},
		[navigate],
	);

	const resolveTransferId = useCallback(
		(id: number) => {
			const file = findHistoryItemById(historyData, id);
			return readTransferIdFromGroupKey(file?.stableKey) ?? file?.transfer?.transferId ?? null;
		},
		[historyData],
	);

	return (
		<HistoryUI
			linkComponent={Link}
			onItemClick={(id) => {
				const transferId = resolveTransferId(id);
				if (transferId) {
					navigateToTransfer(transferId);
				}
			}}
			onTransferDetails={navigateToTransfer}
			onItemReveal={async (id) => {
				const file = findHistoryItemById(historyData, id);

				if (file?.isFile) {
					try {
						await revealItemInDir(file.path);
					} catch (error) {
						console.error("Failed to reveal file in directory:", error);
					}
				}
			}}
			onItemRemove={async (id, scope = "history") => {
				const file = findHistoryItemById(historyData, id);

				if (!file) {
					return;
				}

				const groupedTransferId = readTransferIdFromGroupKey(file.stableKey);
				const isOutgoingTransfer = file.transfer?.direction === "send";

				if (groupedTransferId) {
					if (scope === "both" && !isOutgoingTransfer) {
						const transferFiles = transferRecords.filter((record) => record.transferId === groupedTransferId);
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
				}
			}}
			onBulkDelete={(ids) => {
				console.log("Bulk delete items with ids:", ids);
			}}
			onRefresh={refresh}
			data={historyData}
			loading={isRefreshing}
			invoke={tauriInvoke}
		/>
	);
}

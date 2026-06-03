import { type SyntheticEvent, useCallback, useMemo, useRef, useState } from "react";

import { useDragSelection } from "@workspace/app-ui/hooks/useDragSelection";
import { useExplorerSelection } from "@workspace/app-ui/hooks/useExplorerSelection";
import type { HistoryFileData, HistoryProps } from "@workspace/app-ui/types/history";

import { TERMINAL_STATES } from "../constants";
import { generateHistoryStableId } from "../utils/history-id";
import {
	canRemoveTransfer,
	copyTransfersInfo,
	matchTransferFilter,
	matchTransferSearch,
} from "../utils/transfer-utils";
import type { ActiveTransferView, TransferDeliveryState } from "../../transfer-model";
import type { HistoryPendingRemove, HistoryTransferFilter } from "../types";

type UseHistoryTransfersOptions = {
	data: HistoryFileData[];
	loading?: boolean;
	onBulkDelete?: HistoryProps["onBulkDelete"];
	onItemRemove?: HistoryProps["onItemRemove"];
	onItemReveal?: HistoryProps["onItemReveal"];
	onRefresh?: HistoryProps["onRefresh"];
	onTransferDetails?: HistoryProps["onTransferDetails"];
};

type TransferWithHistoryId = ActiveTransferView & {
	historyId: number;
	transferDetailsId?: string;
};

export function useHistoryTransfers({
	data,
	loading = false,
	onItemRemove,
	onItemReveal,
	onRefresh,
	onTransferDetails,
}: UseHistoryTransfersOptions) {
	const [query, setQuery] = useState("");
	const [filter, setFilter] = useState<HistoryTransferFilter>("all");
	const [contextTransferId, setContextTransferId] = useState<string | null>(null);
	const [isBackgroundContext, setIsBackgroundContext] = useState(false);
	const [pendingRemove, setPendingRemove] = useState<HistoryPendingRemove | null>(null);
	const scrollAreaRootRef = useRef<HTMLDivElement | null>(null);

	const transfers = useMemo(() => data.map(toTransferView), [data]);

	const visibleTransfers = useMemo(() => {
		return transfers.filter((transfer) => {
			return matchTransferFilter(transfer, filter) && matchTransferSearch(transfer, query);
		});
	}, [filter, query, transfers]);

	const {
		selectedIds,
		selectedCount,
		selectedSet,
		hasSelection,
		isSelected,
		selectItem,
		selectAll,
		clearSelection,
		replaceSelection,
		ensureSelectedForContextMenu,
		handleKeyDown,
	} = useExplorerSelection({
		items: visibleTransfers,
		getId: (item) => item.id,
	});

	const dragSelection = useDragSelection({
		scrollAreaRootRef,
		selectedIds,
		onSelectionChange: replaceSelection,
	});

	const transferById = useMemo(() => {
		return new Map(visibleTransfers.map((transfer) => [transfer.id, transfer]));
	}, [visibleTransfers]);

	const contextTransfers = useMemo(() => {
		if (isBackgroundContext) return [];

		if (contextTransferId) {
			const contextTransfer = transferById.get(contextTransferId);
			if (!contextTransfer) return [];

			if (!selectedSet.has(contextTransferId)) {
				return [contextTransfer];
			}
		}

		return selectedIds
			.map((id) => transferById.get(id))
			.filter((transfer): transfer is TransferWithHistoryId => Boolean(transfer));
	}, [contextTransferId, isBackgroundContext, selectedIds, selectedSet, transferById]);

	const contextActionState = useMemo(() => {
		return {
			canCancel: false,
			canPause: false,
			canRemove: Boolean(onItemRemove) && contextTransfers.some(canRemoveTransfer),
			canResume: false,
			canRetry: false,
			canReveal: Boolean(onItemReveal) && contextTransfers.length === 1,
			isSingle: contextTransfers.length === 1,
		};
	}, [contextTransfers, onItemRemove, onItemReveal]);

	const selectedActionState = useMemo(() => {
		const selectedTransfers = selectedIds
			.map((id) => transferById.get(id))
			.filter((transfer): transfer is TransferWithHistoryId => Boolean(transfer));

		return {
			canPause: false,
			canRemove: Boolean(onItemRemove) && selectedTransfers.some(canRemoveTransfer),
			canResume: false,
		};
	}, [onItemRemove, selectedIds, transferById]);

	const refreshData = useCallback(() => {
		if (loading) return;
		void onRefresh?.();
	}, [loading, onRefresh]);

	const clearSearch = useCallback(() => {
		setQuery("");
	}, []);

	const handleSurfaceClick = useCallback(() => {
		if (pendingRemove) return;

		clearSelection();
	}, [clearSelection, pendingRemove]);

	const stopSurfaceEvent = useCallback((event: SyntheticEvent) => {
		event.stopPropagation();
	}, []);

	const requestRemoveTransfers = useCallback(
		(ids: string[]) => {
			if (!onItemRemove) return;

			const uniqueIds = Array.from(new Set(ids));
			if (uniqueIds.length === 0) return;

			setPendingRemove({ ids: uniqueIds });
		},
		[onItemRemove],
	);

	const handleRemoveDialogOpenChange = useCallback((open: boolean) => {
		if (!open) {
			setPendingRemove(null);
		}
	}, []);

	const clearPendingRemove = useCallback(() => {
		setPendingRemove(null);
	}, []);

	const handleConfirmRemoveHistory = useCallback(async () => {
		if (!pendingRemove || !onItemRemove) return;

		const targets = pendingRemove.ids
			.map((id) => transferById.get(id))
			.filter((transfer): transfer is TransferWithHistoryId => Boolean(transfer));

		for (const transfer of targets) {
			await onItemRemove(transfer.historyId, "history");
		}

		setPendingRemove(null);
		setContextTransferId(null);
		replaceSelection(selectedIds.filter((id) => !pendingRemove.ids.includes(id)));
	}, [onItemRemove, pendingRemove, replaceSelection, selectedIds, transferById]);

	const handleConfirmRemoveFiles = useCallback(async () => {
		if (!pendingRemove || !onItemRemove) return;

		const targets = pendingRemove.ids
			.map((id) => transferById.get(id))
			.filter((transfer): transfer is TransferWithHistoryId => Boolean(transfer));

		for (const transfer of targets) {
			await onItemRemove(transfer.historyId, "both");
		}

		setPendingRemove(null);
		setContextTransferId(null);
		replaceSelection(selectedIds.filter((id) => !pendingRemove.ids.includes(id)));
	}, [onItemRemove, pendingRemove, replaceSelection, selectedIds, transferById]);

	const handlePauseSelected = useCallback(() => undefined, []);
	const handleResumeSelected = useCallback(() => undefined, []);

	const handleRemoveSelected = useCallback(() => {
		requestRemoveTransfers(
			selectedIds.filter((id) => {
				const transfer = transferById.get(id);
				return transfer ? TERMINAL_STATES.has(transfer.state) : false;
			}),
		);
	}, [requestRemoveTransfers, selectedIds, transferById]);

	const handleContextPause = useCallback(() => undefined, []);
	const handleContextResume = useCallback(() => undefined, []);
	const handleContextRetry = useCallback(() => undefined, []);
	const handleContextCancel = useCallback(() => undefined, []);

	const handleContextRemove = useCallback(() => {
		requestRemoveTransfers(
			contextTransfers.filter((transfer) => TERMINAL_STATES.has(transfer.state)).map((transfer) => transfer.id),
		);
	}, [contextTransfers, requestRemoveTransfers]);

	const handleContextDetails = useCallback(() => {
		const transfer = contextTransfers[0];
		if (!transfer) return;

		onTransferDetails?.(transfer.transferDetailsId ?? transfer.id);
	}, [contextTransfers, onTransferDetails]);

	const handleContextReveal = useCallback(() => {
		const transfer = contextTransfers[0];
		if (!transfer || !onItemReveal) return;

		onItemReveal(transfer.historyId);
	}, [contextTransfers, onItemReveal]);

	const handleCardPause = useCallback(() => undefined, []);
	const handleCardResume = useCallback(() => undefined, []);
	const handleCardCancel = useCallback(() => undefined, []);

	const handleContextCopyInfo = useCallback(() => {
		copyTransfersInfo(contextTransfers);
	}, [contextTransfers]);

	const handleContextCopyTransferIds = useCallback(() => {
		void window.navigator.clipboard.writeText(
			contextTransfers.map((transfer) => transfer.transferDetailsId ?? transfer.id).join("\n"),
		);
	}, [contextTransfers]);

	const pendingRemoveTransfers = useMemo(() => {
		if (!pendingRemove) return [];

		return pendingRemove.ids
			.map((id) => transferById.get(id))
			.filter((transfer): transfer is TransferWithHistoryId => Boolean(transfer));
	}, [pendingRemove, transferById]);

	const pendingRemoveCount = pendingRemoveTransfers.length;
	const pendingRemoveTitle =
		pendingRemoveCount > 1
			? `ลบรายการ ${pendingRemoveCount} รายการ?`
			: `ลบ ${pendingRemoveTransfers[0]?.title ?? "รายการนี้"}?`;
	const emptyStateText =
		transfers.length === 0 ? "ยังไม่มีประวัติการโอน" : "ไม่พบรายการที่ตรงกับการค้นหา";

	return {
		clearPendingRemove,
		clearSearch,
		clearSelection,
		contextActionState,
		contextTransfers,
		dragSelection,
		emptyStateText,
		ensureSelectedForContextMenu,
		filter,
		handleCardCancel,
		handleCardPause,
		handleCardResume,
		handleContextCancel,
		handleContextCopyInfo,
		handleContextCopyTransferIds,
		handleContextDetails,
		handleContextPause,
		handleContextRemove,
		handleContextResume,
		handleContextRetry,
		handleContextReveal,
		handleKeyDown,
		handleConfirmRemoveFiles,
		handleConfirmRemoveHistory,
		handlePauseSelected,
		handleRemoveDialogOpenChange,
		handleRemoveSelected,
		handleResumeSelected,
		handleSurfaceClick,
		hasSelection,
		isSelected,
		pendingRemove,
		pendingRemoveTitle,
		query,
		refreshData,
		scrollAreaRootRef,
		selectAll,
		selectItem,
		selectedActionState,
		selectedCount,
		setContextTransferId,
		setFilter,
		setIsBackgroundContext,
		setQuery,
		stopSurfaceEvent,
		visibleTransfers,
	};
}

function toTransferView(row: HistoryFileData): TransferWithHistoryId {
	const historyId = generateHistoryStableId(row.stableKey ?? row.path);
	const transfer = row.transfer;
	const totalBytes = Math.max(0, row.size);
	const progressPercent =
		transfer?.status === "success" ? 100 : clampPercent(transfer?.progressPercent ?? 0);
	const transferredBytes =
		transfer?.status === "success"
			? totalBytes
			: Math.round((totalBytes * progressPercent) / 100);
	const state = toDeliveryState(transfer?.status);
	const error = transfer?.error
		? {
				code: "unknown" as const,
				message: transfer.error,
				retryable: false,
			}
		: undefined;

	return {
		id: transfer?.transferId ?? String(historyId),
		historyId,
		transferDetailsId: transfer?.transferId,
		title: row.name,
		kind: row.isDirectory ? "folder" : "file",
		fileCount: 1,
		direction: transfer?.direction ?? "receive",
		state,
		encrypted: false,
		transferredBytes,
		totalBytes,
		targets: [
			{
				id: String(historyId),
				name: transfer?.fromLabel ?? "Unknown",
				deviceName: transfer?.deviceLabel ?? undefined,
				state,
				connectionState: state === "transferring" ? "connected" : state === "failed" ? "failed" : "idle",
				route: {
					type: "unknown",
					protocol: "unknown",
				},
				transferredBytes,
				totalBytes,
				error,
			},
		],
		error,
	};
}

function toDeliveryState(status?: HistoryFileData["transfer"] extends infer T ? T extends { status: infer S } ? S : never : never): TransferDeliveryState {
	if (status === "processing") return "transferring";
	if (status === "success") return "completed";
	if (status === "failed") return "failed";
	return "completed";
}

function clampPercent(value: number): number {
	if (!Number.isFinite(value)) return 0;
	return Math.max(0, Math.min(100, value));
}

export type HistoryTransfersController = ReturnType<typeof useHistoryTransfers>;

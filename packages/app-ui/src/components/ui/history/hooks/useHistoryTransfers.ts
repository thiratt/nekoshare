import { type SyntheticEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useDragSelection } from "@workspace/app-ui/hooks/useDragSelection";
import { useExplorerSelection } from "@workspace/app-ui/hooks/useExplorerSelection";
import type { HistoryProps } from "@workspace/app-ui/types/history";

import { PAUSABLE_STATES, TERMINAL_STATES } from "../constants";
import {
	type ActiveTransferView,
	mockActiveTransfers,
	tickActiveTransfers,
	TRANSFER_TICK_MS,
} from "../data/transfer-demo";
import {
	aggregateTransferView,
	canCancelTransfer,
	canPauseTransfer,
	canRemoveTransfer,
	copyTransfersInfo,
	defaultSpeedBps,
	matchTransferFilter,
	matchTransferSearch,
} from "../utils/transfer-utils";
import type { HistoryPendingRemove, HistoryTransferFilter } from "../types";

type UseHistoryTransfersOptions = {
	onTransferDetails?: HistoryProps["onTransferDetails"];
};

export function useHistoryTransfers({ onTransferDetails }: UseHistoryTransfersOptions) {
	const [query, setQuery] = useState("");
	const [filter, setFilter] = useState<HistoryTransferFilter>("all");
	const [transfers, setTransfers] = useState<ActiveTransferView[]>(() => mockActiveTransfers);
	const [contextTransferId, setContextTransferId] = useState<string | null>(null);
	const [isBackgroundContext, setIsBackgroundContext] = useState(false);
	const [pendingRemove, setPendingRemove] = useState<HistoryPendingRemove | null>(null);
	const scrollAreaRootRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		const interval = window.setInterval(() => {
			setTransfers(tickActiveTransfers);
		}, TRANSFER_TICK_MS);

		return () => window.clearInterval(interval);
	}, []);

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
			.filter((transfer): transfer is ActiveTransferView => Boolean(transfer));
	}, [contextTransferId, isBackgroundContext, selectedIds, selectedSet, transferById]);

	const contextActionState = useMemo(() => {
		return {
			canCancel: contextTransfers.some(canCancelTransfer),
			canPause: contextTransfers.some(canPauseTransfer),
			canRemove: contextTransfers.some(canRemoveTransfer),
			canResume: contextTransfers.some((transfer) => transfer.state === "paused"),
			canRetry: contextTransfers.some(
				(transfer) => transfer.state === "failed" || transfer.state === "cancelled",
			),
			isSingle: contextTransfers.length === 1,
		};
	}, [contextTransfers]);

	const selectedActionState = useMemo(() => {
		const selectedTransfers = selectedIds
			.map((id) => transferById.get(id))
			.filter((transfer): transfer is ActiveTransferView => Boolean(transfer));

		return {
			canPause: selectedTransfers.some(canPauseTransfer),
			canRemove: selectedTransfers.some(canRemoveTransfer),
			canResume: selectedTransfers.some((transfer) => transfer.state === "paused"),
		};
	}, [selectedIds, transferById]);

	const refreshData = useCallback(() => {
		setTransfers(mockActiveTransfers);
	}, []);

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

	const pauseTransfers = useCallback((ids: string[]) => {
		const idSet = new Set(ids);
		setTransfers((currentTransfers) =>
			currentTransfers.map((transfer) => {
				if (!idSet.has(transfer.id) || !PAUSABLE_STATES.has(transfer.state)) return transfer;

				return aggregateTransferView({
					...transfer,
					targets: transfer.targets.map((target) =>
						target.state === "transferring"
							? {
									...target,
									state: "paused",
									speedBps: 0,
									etaSeconds: undefined,
								}
							: target,
					),
				});
			}),
		);
	}, []);

	const resumeTransfers = useCallback((ids: string[]) => {
		const idSet = new Set(ids);
		setTransfers((currentTransfers) =>
			currentTransfers.map((transfer) => {
				if (!idSet.has(transfer.id) || transfer.state !== "paused") return transfer;

				return aggregateTransferView({
					...transfer,
					targets: transfer.targets.map((target) => {
						if (target.state !== "paused") return target;

						const speedBps = defaultSpeedBps(target.route.type);
						return {
							...target,
							state: "transferring",
							connectionState: "connected",
							speedBps,
							etaSeconds: Math.ceil((target.totalBytes - target.transferredBytes) / speedBps),
						};
					}),
				});
			}),
		);
	}, []);

	const retryTransfers = useCallback((ids: string[]) => {
		const idSet = new Set(ids);
		setTransfers((currentTransfers) =>
			currentTransfers.map((transfer) => {
				if (!idSet.has(transfer.id) || (transfer.state !== "failed" && transfer.state !== "cancelled"))
					return transfer;

				return aggregateTransferView({
					...transfer,
					error: undefined,
					targets: transfer.targets.map((target) => {
						if (target.state !== "failed" && target.state !== "cancelled") return target;

						const speedBps = defaultSpeedBps(target.route.type);
						return {
							...target,
							state: "transferring",
							connectionState: "connected",
							speedBps,
							etaSeconds: Math.ceil((target.totalBytes - target.transferredBytes) / speedBps),
							error: undefined,
						};
					}),
				});
			}),
		);
	}, []);

	const cancelTransfers = useCallback((ids: string[]) => {
		const idSet = new Set(ids);
		setTransfers((currentTransfers) =>
			currentTransfers.map((transfer) => {
				if (!idSet.has(transfer.id) || TERMINAL_STATES.has(transfer.state)) return transfer;

				return aggregateTransferView({
					...transfer,
					error: {
						code: "cancelled",
						message: "Transfer cancelled.",
						retryable: true,
					},
					targets: transfer.targets.map((target) =>
						TERMINAL_STATES.has(target.state)
							? target
							: {
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
								},
					),
				});
			}),
		);
	}, []);

	const removeTransfersFromHistory = useCallback(
		(ids: string[]) => {
			const idSet = new Set(ids);
			setTransfers((currentTransfers) =>
				currentTransfers.filter((transfer) => !idSet.has(transfer.id) || !TERMINAL_STATES.has(transfer.state)),
			);
			setContextTransferId((currentId) => (currentId && idSet.has(currentId) ? null : currentId));
			replaceSelection(selectedIds.filter((id) => !idSet.has(id)));
		},
		[replaceSelection, selectedIds],
	);

	const requestRemoveTransfers = useCallback((ids: string[]) => {
		const uniqueIds = Array.from(new Set(ids));
		if (uniqueIds.length === 0) return;

		setPendingRemove({ ids: uniqueIds });
	}, []);

	const handleRemoveDialogOpenChange = useCallback((open: boolean) => {
		if (!open) {
			setPendingRemove(null);
		}
	}, []);

	const clearPendingRemove = useCallback(() => {
		setPendingRemove(null);
	}, []);

	const handleConfirmRemoveHistory = useCallback(() => {
		if (!pendingRemove) return;

		removeTransfersFromHistory(pendingRemove.ids);
		setPendingRemove(null);
	}, [pendingRemove, removeTransfersFromHistory]);

	const handleConfirmRemoveFiles = useCallback(() => {
		if (!pendingRemove) return;

		// Mock UI only: the runtime file deletion path is not wired here yet.
		removeTransfersFromHistory(pendingRemove.ids);
		setPendingRemove(null);
	}, [pendingRemove, removeTransfersFromHistory]);

	const handlePauseSelected = useCallback(() => {
		pauseTransfers(selectedIds);
	}, [pauseTransfers, selectedIds]);

	const handleResumeSelected = useCallback(() => {
		resumeTransfers(selectedIds);
	}, [resumeTransfers, selectedIds]);

	const handleRemoveSelected = useCallback(() => {
		requestRemoveTransfers(
			selectedIds.filter((id) => {
				const transfer = transferById.get(id);
				return transfer ? TERMINAL_STATES.has(transfer.state) : false;
			}),
		);
	}, [requestRemoveTransfers, selectedIds, transferById]);

	const handleContextPause = useCallback(() => {
		pauseTransfers(
			contextTransfers.filter((transfer) => PAUSABLE_STATES.has(transfer.state)).map((transfer) => transfer.id),
		);
	}, [contextTransfers, pauseTransfers]);

	const handleContextResume = useCallback(() => {
		resumeTransfers(
			contextTransfers.filter((transfer) => transfer.state === "paused").map((transfer) => transfer.id),
		);
	}, [contextTransfers, resumeTransfers]);

	const handleContextRetry = useCallback(() => {
		retryTransfers(
			contextTransfers
				.filter((transfer) => transfer.state === "failed" || transfer.state === "cancelled")
				.map((transfer) => transfer.id),
		);
	}, [contextTransfers, retryTransfers]);

	const handleContextCancel = useCallback(() => {
		cancelTransfers(
			contextTransfers.filter((transfer) => !TERMINAL_STATES.has(transfer.state)).map((transfer) => transfer.id),
		);
	}, [cancelTransfers, contextTransfers]);

	const handleContextRemove = useCallback(() => {
		requestRemoveTransfers(
			contextTransfers.filter((transfer) => TERMINAL_STATES.has(transfer.state)).map((transfer) => transfer.id),
		);
	}, [contextTransfers, requestRemoveTransfers]);

	const handleContextDetails = useCallback(() => {
		const transfer = contextTransfers[0];
		if (!transfer) return;

		onTransferDetails?.(transfer.id);
	}, [contextTransfers, onTransferDetails]);

	const handleContextReveal = useCallback(() => {
		const transfer = contextTransfers[0];
		if (!transfer) return;

		console.log("reveal file", transfer.id);
	}, [contextTransfers]);

	const handleCardPause = useCallback(
		(id: string) => {
			pauseTransfers([id]);
		},
		[pauseTransfers],
	);

	const handleCardResume = useCallback(
		(id: string) => {
			resumeTransfers([id]);
		},
		[resumeTransfers],
	);

	const handleCardCancel = useCallback(
		(id: string) => {
			cancelTransfers([id]);
		},
		[cancelTransfers],
	);

	const handleContextCopyInfo = useCallback(() => {
		copyTransfersInfo(contextTransfers);
	}, [contextTransfers]);

	const handleContextCopyTransferIds = useCallback(() => {
		void window.navigator.clipboard.writeText(contextTransfers.map((transfer) => transfer.id).join("\n"));
	}, [contextTransfers]);

	const pendingRemoveTransfers = useMemo(() => {
		if (!pendingRemove) return [];

		return pendingRemove.ids
			.map((id) => transferById.get(id))
			.filter((transfer): transfer is ActiveTransferView => Boolean(transfer));
	}, [pendingRemove, transferById]);

	const pendingRemoveCount = pendingRemoveTransfers.length;
	const pendingRemoveTitle =
		pendingRemoveCount > 1
			? `ลบรายการ ${pendingRemoveCount} รายการ?`
			: `ลบ ${pendingRemoveTransfers[0]?.title ?? "รายการนี้"}?`;

	return {
		clearPendingRemove,
		clearSearch,
		clearSelection,
		contextActionState,
		contextTransfers,
		dragSelection,
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

export type HistoryTransfersController = ReturnType<typeof useHistoryTransfers>;

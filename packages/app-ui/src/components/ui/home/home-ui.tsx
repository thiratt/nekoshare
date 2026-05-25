import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AnimatePresence, motion } from "motion/react";
import {
	LuCopy,
	LuEllipsis,
	LuFileText,
	LuFolderOpen,
	LuInfo,
	LuPause,
	LuPlay,
	LuRefreshCcw,
	LuRotateCcw,
	LuTrash2,
	LuX,
} from "react-icons/lu";
import { TbDeselect, TbSelectAll } from "react-icons/tb";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogMedia,
	AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import { Button } from "@workspace/ui/components/button";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from "@workspace/ui/components/context-menu";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { SearchInput } from "@workspace/ui/components/search-input";
import { Separator } from "@workspace/ui/components/separator";

import { CardTransition } from "@workspace/app-ui/components/ext/card-transition";
import { useDragSelection } from "@workspace/app-ui/hooks/useDragSelection";
import { useExplorerSelection } from "@workspace/app-ui/hooks/useExplorerSelection";
import type { HomeProps } from "@workspace/app-ui/types/home";

import { FilterTabs } from "./filter-tabs";
import { type ActiveTransfer, ActiveTransferCard, mockActiveTransfers } from "./transfer-card";

const TRANSFER_LIST_TRANSITION = {
	type: "spring",
	duration: 0.32,
	bounce: 0,
} as const;

const TRANSFER_ITEM_TRANSITION = {
	type: "spring",
	duration: 0.28,
	bounce: 0,
	opacity: {
		duration: 0.14,
	},
} as const;

type TransferFilter = "all" | "active" | "failed";
type PendingRemove = {
	ids: string[];
};

const ACTIVE_STATES = new Set<ActiveTransfer["state"]>([
	"connecting",
	"listening",
	"handshaking",
	"transferring",
	"paused",
	"recovering",
	"verifying",
]);

const PAUSABLE_STATES = new Set<ActiveTransfer["state"]>(["transferring", "recovering"]);
const TERMINAL_STATES = new Set<ActiveTransfer["state"]>(["completed", "failed", "cancelled"]);
const MB = 1024 ** 2;
const TRANSFER_TICK_MS = 800;

function matchTransferFilter(transfer: ActiveTransfer, filter: TransferFilter) {
	if (filter === "all") return true;
	if (filter === "active") return ACTIVE_STATES.has(transfer.state);
	if (filter === "failed") return transfer.state === "failed";

	return true;
}

function normalizeSearchText(value: string) {
	return value.trim().toLowerCase();
}

function matchTransferSearch(transfer: ActiveTransfer, query: string) {
	const normalizedQuery = normalizeSearchText(query);

	if (!normalizedQuery) return true;

	const searchableText = [
		transfer.name,
		transfer.peerName,
		transfer.deviceName,
		transfer.path,
		transfer.state,
		transfer.direction,
		transfer.encrypted ? "encrypted เข้ารหัส" : "encryption off ไม่เข้ารหัส",
		transfer.isFolder ? "folder โฟลเดอร์" : "file ไฟล์",
	]
		.filter(Boolean)
		.join(" ")
		.toLowerCase();

	return searchableText.includes(normalizedQuery);
}

function copyTransfersInfo(transfers: ActiveTransfer[]) {
	void window.navigator.clipboard.writeText(transfers.map(formatTransferInfo).join("\n\n"));
}

function formatTransferInfo(transfer: ActiveTransfer) {
	return [
		`Transfer: ${transfer.name}`,
		`State: ${transfer.state}`,
		`Direction: ${transfer.direction}`,
		`Path: ${transfer.path}`,
		`Encrypted: ${transfer.encrypted ? "Yes" : "No"}`,
		`Peer: ${transfer.peerName}`,
		transfer.deviceName ? `Device: ${transfer.deviceName}` : null,
		`Transfer ID: ${transfer.id}`,
	]
		.filter(Boolean)
		.join("\n");
}

export function HomeUI(_props: HomeProps) {
	const [query, setQuery] = useState("");
	const [filter, setFilter] = useState<TransferFilter>("all");
	const [transfers, setTransfers] = useState<ActiveTransfer[]>(() => mockActiveTransfers);
	const [contextTransferId, setContextTransferId] = useState<string | null>(null);
	const [isBackgroundContext, setIsBackgroundContext] = useState(false);
	const [pendingRemove, setPendingRemove] = useState<PendingRemove | null>(null);
	const scrollAreaRootRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		const interval = window.setInterval(() => {
			setTransfers((currentTransfers) => {
				let changed = false;
				const nextTransfers: ActiveTransfer[] = currentTransfers.map((transfer): ActiveTransfer => {
					if (transfer.state === "verifying") {
						changed = true;
						return {
							...transfer,
							state: "completed",
							speedBps: 0,
							etaSeconds: 0,
							transferredBytes: transfer.totalBytes,
						};
					}

					if (transfer.state !== "transferring") {
						return transfer;
					}

					const currentSpeed = transfer.speedBps && transfer.speedBps > 0 ? transfer.speedBps : 18 * MB;
					const speedJitter = 0.85 + Math.random() * 0.3;
					const nextSpeed = Math.round(currentSpeed * speedJitter);
					const nextTransferredBytes = Math.min(
						transfer.totalBytes,
						transfer.transferredBytes + nextSpeed * (TRANSFER_TICK_MS / 1000),
					);
					changed = true;

					if (nextTransferredBytes >= transfer.totalBytes) {
						return {
							...transfer,
							state: "completed",
							transferredBytes: transfer.totalBytes,
							speedBps: 0,
							etaSeconds: 0,
						};
					}

					return {
						...transfer,
						transferredBytes: nextTransferredBytes,
						speedBps: nextSpeed,
						etaSeconds: Math.ceil((transfer.totalBytes - nextTransferredBytes) / nextSpeed),
					};
				});

				return changed ? nextTransfers : currentTransfers;
			});
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
			.filter((transfer): transfer is ActiveTransfer => Boolean(transfer));
	}, [contextTransferId, isBackgroundContext, selectedIds, selectedSet, transferById]);

	const contextActionState = useMemo(() => {
		return {
			canCancel: contextTransfers.some((transfer) => !TERMINAL_STATES.has(transfer.state)),
			canPause: contextTransfers.some((transfer) => PAUSABLE_STATES.has(transfer.state)),
			canRemove: contextTransfers.some((transfer) => TERMINAL_STATES.has(transfer.state)),
			canResume: contextTransfers.some((transfer) => transfer.state === "paused"),
			canRetry: contextTransfers.some((transfer) => transfer.state === "failed"),
			isSingle: contextTransfers.length === 1,
		};
	}, [contextTransfers]);

	const selectedActionState = useMemo(() => {
		const selectedTransfers = selectedIds
			.map((id) => transferById.get(id))
			.filter((transfer): transfer is ActiveTransfer => Boolean(transfer));

		return {
			canPause: selectedTransfers.some((transfer) => PAUSABLE_STATES.has(transfer.state)),
			canRemove: selectedTransfers.some((transfer) => TERMINAL_STATES.has(transfer.state)),
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

	const stopSurfaceEvent = useCallback((event: React.SyntheticEvent) => {
		event.stopPropagation();
	}, []);

	const handleShareFiles = useCallback(() => {
		setTransfers((currentTransfers) => [
			{
				id: `tr_mock_${Date.now()}`,
				name: "new-share-bundle.zip",
				fileCount: 1,
				isFolder: false,
				direction: "send",
				peerName: "Nearby Device",
				deviceName: "Neko Share",
				path: "lan",
				encrypted: true,
				state: "transferring",
				transferredBytes: 0,
				totalBytes: 1.8 * 1024 ** 3,
				speedBps: 42 * MB,
				etaSeconds: 44,
			},
			...currentTransfers,
		]);
	}, []);

	const pauseTransfers = useCallback((ids: string[]) => {
		const idSet = new Set(ids);
		setTransfers((currentTransfers) =>
			currentTransfers.map((transfer) => {
				if (!idSet.has(transfer.id) || !PAUSABLE_STATES.has(transfer.state)) return transfer;

				return {
					...transfer,
					state: "paused",
					speedBps: 0,
					etaSeconds: undefined,
				};
			}),
		);
	}, []);

	const resumeTransfers = useCallback((ids: string[]) => {
		const idSet = new Set(ids);
		setTransfers((currentTransfers) =>
			currentTransfers.map((transfer) => {
				if (!idSet.has(transfer.id) || transfer.state !== "paused") return transfer;

				const speedBps = transfer.path === "lan" ? 72 * MB : 24 * MB;

				return {
					...transfer,
					state: "transferring",
					speedBps,
					etaSeconds: Math.ceil((transfer.totalBytes - transfer.transferredBytes) / speedBps),
				};
			}),
		);
	}, []);

	const retryTransfers = useCallback((ids: string[]) => {
		const idSet = new Set(ids);
		setTransfers((currentTransfers) =>
			currentTransfers.map((transfer) => {
				if (!idSet.has(transfer.id) || transfer.state !== "failed") return transfer;

				const speedBps = transfer.path === "lan" ? 48 * MB : 16 * MB;

				return {
					...transfer,
					state: "transferring",
					speedBps,
					etaSeconds: Math.ceil((transfer.totalBytes - transfer.transferredBytes) / speedBps),
					errorMessage: undefined,
				};
			}),
		);
	}, []);

	const cancelTransfers = useCallback((ids: string[]) => {
		const idSet = new Set(ids);
		setTransfers((currentTransfers) =>
			currentTransfers.map((transfer) => {
				if (!idSet.has(transfer.id) || TERMINAL_STATES.has(transfer.state)) return transfer;

				return {
					...transfer,
					state: "cancelled",
					speedBps: 0,
					etaSeconds: undefined,
					errorMessage: "Transfer cancelled.",
				};
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
			contextTransfers.filter((transfer) => transfer.state === "failed").map((transfer) => transfer.id),
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

		console.log("show details", transfer.id);
	}, [contextTransfers]);

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
			.filter((transfer): transfer is ActiveTransfer => Boolean(transfer));
	}, [pendingRemove, transferById]);

	const pendingRemoveCount = pendingRemoveTransfers.length;
	const pendingRemoveTitle =
		pendingRemoveCount > 1
			? `ลบรายการ ${pendingRemoveCount} รายการ?`
			: `ลบ ${pendingRemoveTransfers[0]?.name ?? "รายการนี้"}?`;

	return (
		<div
			className="flex h-full flex-col focus:outline-none focus:ring-0"
			onClick={handleSurfaceClick}
			onKeyDown={handleKeyDown}
			tabIndex={0}
		>
			<CardTransition className="flex h-full flex-col gap-0" tag="home-card">
				<CardHeader>
					<div className="space-y-1">
						<CardTitle>ประวัติการแชร์</CardTitle>
						<CardDescription>ไฟล์ที่กำลังรับส่งและประวัติการแชร์จะแสดงที่นี่</CardDescription>
					</div>

					<div className="flex items-center gap-2">
						<div className="flex min-w-0 items-center gap-2">
							<Button
								variant="outline"
								size="icon"
								onClick={(event) => {
									event.stopPropagation();
									refreshData();
								}}
							>
								<LuRefreshCcw className="h-4 w-4" />
							</Button>

							<SearchInput
								searchQuery={query}
								onSearchQuery={setQuery}
								onClearSearch={clearSearch}
								className="w-64"
								placeholder="ค้นหาไฟล์ อุปกรณ์ หรือสถานะ..."
							/>

							<Separator orientation="vertical" />

							<FilterTabs
								value={filter}
								onValueChange={setFilter}
								items={[
									{
										value: "all",
										label: "ทั้งหมด",
									},
									{
										value: "active",
										label: "กำลังดำเนินการ",
									},
									{
										value: "failed",
										label: "ล้มเหลว",
									},
								]}
							/>

							<Separator orientation="vertical" />

							<div className="flex items-center gap-1" onClick={(event) => event.stopPropagation()}>
								<Button
									variant="destructive"
									size="icon"
									onClick={handleRemoveSelected}
									disabled={!selectedActionState.canRemove}
								>
									<LuTrash2 className="h-4 w-4" />
								</Button>

								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button variant="outline" size="icon" aria-label="More options">
											<LuEllipsis className="h-4 w-4" />
										</Button>
									</DropdownMenuTrigger>

									<DropdownMenuContent className="w-52" align="start">
										<DropdownMenuGroup>
											<DropdownMenuItem
												onSelect={() => (!hasSelection ? selectAll() : clearSelection())}
											>
												{!hasSelection ? <TbSelectAll /> : <TbDeselect />}
												{!hasSelection ? "เลือกทั้งหมด" : "ยกเลิกการเลือกทั้งหมด"}
											</DropdownMenuItem>
										</DropdownMenuGroup>

										<DropdownMenuSeparator />

										<DropdownMenuGroup>
											<DropdownMenuItem
												disabled={!selectedActionState.canPause}
												onSelect={handlePauseSelected}
											>
												<LuPause />
												หยุดชั่วคราว
											</DropdownMenuItem>

											<DropdownMenuItem
												disabled={!selectedActionState.canResume}
												onSelect={handleResumeSelected}
											>
												<LuPlay />
												ดำเนินการต่อ
											</DropdownMenuItem>
										</DropdownMenuGroup>
									</DropdownMenuContent>
								</DropdownMenu>
							</div>
						</div>

						<div className="ms-auto flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
							<Button onClick={handleShareFiles}>แชร์ไฟล์</Button>
						</div>
					</div>

					<Separator className="my-1" />
				</CardHeader>

				<CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden">
					<div ref={scrollAreaRootRef} className="min-h-0 flex-1">
						<ScrollArea className="h-full">
							<ContextMenu>
								<ContextMenuTrigger asChild>
									<motion.div
										layout
										className="relative flex min-h-full flex-col gap-2 py-2 pr-2.5"
										onContextMenuCapture={(event) => {
											if (
												event.target instanceof HTMLElement &&
												event.target.closest("[data-selectable-id]")
											) {
												return;
											}

											setContextTransferId(null);
											setIsBackgroundContext(true);
										}}
										{...dragSelection.containerProps}
									>
										{dragSelection.selectionBox ? (
											<div
												className="pointer-events-none absolute z-50 border border-primary/70 bg-primary/15"
												style={{
													left: dragSelection.selectionBox.left,
													top: dragSelection.selectionBox.top,
													width: dragSelection.selectionBox.width,
													height: dragSelection.selectionBox.height,
												}}
											/>
										) : null}

										<AnimatePresence initial={false} mode="popLayout">
											{visibleTransfers.length === 0 ? (
												<motion.div
													key="empty"
													layout
													initial={{ opacity: 0, scale: 0.96 }}
													animate={{ opacity: 1, scale: 1 }}
													exit={{ opacity: 0, scale: 0.96 }}
													transition={{
														duration: 0.18,
														ease: [0.16, 1, 0.3, 1],
													}}
													className="flex min-h-[calc(100vh-260px)] flex-1 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground"
												>
													ไม่พบรายการที่ตรงกับการค้นหา
												</motion.div>
											) : (
												visibleTransfers.map((transfer) => (
													<motion.div
														key={transfer.id}
														layout="position"
														data-selectable-id={transfer.id}
														initial={{
															opacity: 0,
															scale: 0.985,
															y: 10,
														}}
														animate={{
															opacity: 1,
															scale: 1,
															y: 0,
														}}
														exit={{
															opacity: 0,
															scale: 0.985,
															y: -8,
															transition: {
																duration: 0.16,
																ease: [0.16, 1, 0.3, 1],
															},
														}}
														transition={{
															layout: TRANSFER_LIST_TRANSITION,
															default: TRANSFER_ITEM_TRANSITION,
														}}
														style={{
															originY: 0.5,
														}}
													>
														<ActiveTransferCard
															selected={isSelected(transfer.id)}
															transfer={transfer}
															onPause={handleCardPause}
															onResume={handleCardResume}
															onCancel={handleCardCancel}
															onShowDetails={(id) => console.log("show details", id)}
															onSelected={(event) => selectItem(transfer.id, event)}
															onContextSelected={() => {
																setContextTransferId(transfer.id);
																setIsBackgroundContext(false);
																ensureSelectedForContextMenu(transfer.id);
															}}
														/>
													</motion.div>
												))
											)}
										</AnimatePresence>
									</motion.div>
								</ContextMenuTrigger>
								<ContextMenuContent
									className="w-64"
									onClick={stopSurfaceEvent}
									onPointerDown={stopSurfaceEvent}
								>
									{contextTransfers.length === 0 ? (
										<>
											<ContextMenuItem onSelect={refreshData}>
												<LuRefreshCcw />
												รีเฟรช
											</ContextMenuItem>
											<ContextMenuItem
												disabled={visibleTransfers.length === 0}
												onSelect={selectAll}
											>
												<TbSelectAll />
												เลือกทั้งหมด
											</ContextMenuItem>
										</>
									) : (
										<>
											{contextActionState.canPause ? (
												<ContextMenuItem onSelect={handleContextPause}>
													<LuPause />
													หยุดรายการที่เลือกชั่วคราว
												</ContextMenuItem>
											) : null}
											{contextActionState.canResume ? (
												<ContextMenuItem onSelect={handleContextResume}>
													<LuPlay />
													ดำเนินการรายการที่เลือกต่อ
												</ContextMenuItem>
											) : null}
											{contextActionState.canRetry ? (
												<ContextMenuItem onSelect={handleContextRetry}>
													<LuRotateCcw />
													ลองรายการที่ล้มเหลวใหม่
												</ContextMenuItem>
											) : null}

											{contextActionState.canPause ||
											contextActionState.canResume ||
											contextActionState.canRetry ? (
												<ContextMenuSeparator />
											) : null}

											<ContextMenuItem
												disabled={!contextActionState.isSingle}
												onSelect={handleContextDetails}
											>
												<LuInfo />
												ดูรายละเอียด
											</ContextMenuItem>
											<ContextMenuItem onSelect={handleContextCopyInfo}>
												<LuCopy />
												คัดลอกข้อมูลการโอน
											</ContextMenuItem>
											<ContextMenuItem onSelect={handleContextCopyTransferIds}>
												<LuFileText />
												คัดลอก Transfer ID
											</ContextMenuItem>
											<ContextMenuItem
												disabled={!contextActionState.isSingle}
												onSelect={handleContextReveal}
											>
												<LuFolderOpen />
												เปิดตำแหน่งไฟล์
											</ContextMenuItem>

											<ContextMenuSeparator />

											{contextActionState.canCancel ? (
												<ContextMenuItem variant="destructive" onSelect={handleContextCancel}>
													<LuX />
													ยกเลิกรายการที่เลือก
												</ContextMenuItem>
											) : null}
											{contextActionState.canRemove ? (
												<ContextMenuItem variant="destructive" onSelect={handleContextRemove}>
													<LuTrash2 />
													ลบออกจากประวัติ
												</ContextMenuItem>
											) : null}
										</>
									)}
								</ContextMenuContent>
							</ContextMenu>
						</ScrollArea>
					</div>

					<div className="flex shrink-0 gap-2 border-t pt-4 text-sm text-muted-foreground">
						<p>{visibleTransfers.length} รายการ</p>
						{selectedCount > 0 && <p>({selectedCount} รายการที่เลือก)</p>}
					</div>
				</CardContent>
			</CardTransition>

			<AlertDialog open={Boolean(pendingRemove)} onOpenChange={handleRemoveDialogOpenChange}>
				<AlertDialogContent className="max-w-sm" onClick={stopSurfaceEvent} onPointerDown={stopSurfaceEvent}>
					<AlertDialogHeader>
						<AlertDialogMedia className="text-destructive">
							<LuTrash2 />
						</AlertDialogMedia>
						<AlertDialogTitle>{pendingRemoveTitle}</AlertDialogTitle>
						<AlertDialogDescription>
							เลือกว่าจะลบเฉพาะประวัติการโอน หรือจะลบไฟล์ออกจากเครื่องพร้อมประวัติ
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter className="sm:flex-col sm:justify-start">
						<AlertDialogCancel onClick={() => setPendingRemove(null)}>ยกเลิก</AlertDialogCancel>
						<AlertDialogAction variant="outline" onClick={handleConfirmRemoveHistory}>
							ลบเฉพาะประวัติ
						</AlertDialogAction>
						<AlertDialogAction variant="destructive" onClick={handleConfirmRemoveFiles}>
							ลบไฟล์และประวัติ
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}

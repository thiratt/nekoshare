import { useCallback, useMemo, useRef, useState } from "react";

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
	const [contextTransferId, setContextTransferId] = useState<string | null>(null);
	const [isBackgroundContext, setIsBackgroundContext] = useState(false);
	const scrollAreaRootRef = useRef<HTMLDivElement | null>(null);

	const visibleTransfers = useMemo(() => {
		return mockActiveTransfers.filter((transfer) => {
			return matchTransferFilter(transfer, filter) && matchTransferSearch(transfer, query);
		});
	}, [filter, query]);

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

	const refreshData = useCallback(() => {
		console.log("refresh data");
	}, []);

	const clearSearch = useCallback(() => {
		setQuery("");
	}, []);

	const stopSurfaceEvent = useCallback((event: React.SyntheticEvent) => {
		event.stopPropagation();
	}, []);

	const handleShareFiles = useCallback(() => {
		console.log("share files");
	}, []);

	const handlePauseSelected = useCallback(() => {
		console.log("pause selected transfers", selectedIds);
	}, [selectedIds]);

	const handleResumeSelected = useCallback(() => {
		console.log("resume selected transfers", selectedIds);
	}, [selectedIds]);

	const handleRemoveSelected = useCallback(() => {
		console.log("remove selected transfers", selectedIds);
	}, [selectedIds]);

	const handleContextPause = useCallback(() => {
		console.log(
			"pause context transfers",
			contextTransfers.filter((transfer) => PAUSABLE_STATES.has(transfer.state)).map((transfer) => transfer.id),
		);
	}, [contextTransfers]);

	const handleContextResume = useCallback(() => {
		console.log(
			"resume context transfers",
			contextTransfers.filter((transfer) => transfer.state === "paused").map((transfer) => transfer.id),
		);
	}, [contextTransfers]);

	const handleContextRetry = useCallback(() => {
		console.log(
			"retry context transfers",
			contextTransfers.filter((transfer) => transfer.state === "failed").map((transfer) => transfer.id),
		);
	}, [contextTransfers]);

	const handleContextCancel = useCallback(() => {
		console.log(
			"cancel context transfers",
			contextTransfers.filter((transfer) => !TERMINAL_STATES.has(transfer.state)).map((transfer) => transfer.id),
		);
	}, [contextTransfers]);

	const handleContextRemove = useCallback(() => {
		console.log(
			"remove context transfers",
			contextTransfers.filter((transfer) => TERMINAL_STATES.has(transfer.state)).map((transfer) => transfer.id),
		);
	}, [contextTransfers]);

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

	const handleContextCopyInfo = useCallback(() => {
		copyTransfersInfo(contextTransfers);
	}, [contextTransfers]);

	const handleContextCopyTransferIds = useCallback(() => {
		void window.navigator.clipboard.writeText(contextTransfers.map((transfer) => transfer.id).join("\n"));
	}, [contextTransfers]);

	return (
		<div
			className="flex h-full flex-col focus:outline-none focus:ring-0"
			onClick={clearSelection}
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
									disabled={!hasSelection}
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
											<DropdownMenuItem disabled={!hasSelection} onSelect={handlePauseSelected}>
												<LuPause />
												หยุดชั่วคราว
											</DropdownMenuItem>

											<DropdownMenuItem disabled={!hasSelection} onSelect={handleResumeSelected}>
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
															onPause={(id) => console.log("pause", id)}
															onResume={(id) => console.log("resume", id)}
															onCancel={(id) => console.log("cancel", id)}
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
		</div>
	);
}

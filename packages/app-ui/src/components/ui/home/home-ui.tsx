import { useCallback, useMemo, useRef, useState } from "react";

import { AnimatePresence, motion } from "motion/react";
import { LuEllipsis, LuPause, LuPlay, LuRefreshCcw, LuTrash2 } from "react-icons/lu";
import { TbDeselect, TbSelectAll } from "react-icons/tb";

import { Button } from "@workspace/ui/components/button";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
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

function copyTransferInfo(transfer: ActiveTransfer) {
	const lines = [
		`Transfer: ${transfer.name}`,
		`State: ${transfer.state}`,
		`Direction: ${transfer.direction}`,
		`Path: ${transfer.path}`,
		`Encrypted: ${transfer.encrypted ? "Yes" : "No"}`,
		`Peer: ${transfer.peerName}`,
		transfer.deviceName ? `Device: ${transfer.deviceName}` : null,
		`Transfer ID: ${transfer.id}`,
	].filter(Boolean);

	void window.navigator.clipboard.writeText(lines.join("\n"));
}

export function HomeUI(_props: HomeProps) {
	const [query, setQuery] = useState("");
	const [filter, setFilter] = useState<TransferFilter>("all");
	const scrollAreaRootRef = useRef<HTMLDivElement | null>(null);

	const visibleTransfers = useMemo(() => {
		return mockActiveTransfers.filter((transfer) => {
			return matchTransferFilter(transfer, filter) && matchTransferSearch(transfer, query);
		});
	}, [filter, query]);

	const {
		selectedIds,
		selectedCount,
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

	const refreshData = useCallback(() => {
		console.log("refresh data");
	}, []);

	const clearSearch = useCallback(() => {
		setQuery("");
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
							<motion.div
								layout
								className="relative flex min-h-full flex-col gap-2 py-2 pr-2.5"
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
													onRetry={(id) => console.log("retry", id)}
													onShowDetails={(id) => console.log("show details", id)}
													onCopyInfo={(id) => {
														const item = mockActiveTransfers.find(
															(transfer) => transfer.id === id,
														);
														if (item) copyTransferInfo(item);
													}}
													onCopyTransferId={(id) => {
														void window.navigator.clipboard.writeText(id);
													}}
													onRevealFile={(id) => console.log("reveal file", id)}
													onRemoveFromHistory={(id) => console.log("remove from history", id)}
													onSelected={(event) => selectItem(transfer.id, event)}
													onContextSelected={() => ensureSelectedForContextMenu(transfer.id)}
												/>
											</motion.div>
										))
									)}
								</AnimatePresence>
							</motion.div>
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

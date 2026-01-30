import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
	type RowSelectionState,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
	LuChevronDown,
	LuCopy,
	LuFile,
	LuFolderInput,
	LuGlobe,
	LuLoader,
	LuRefreshCcw,
	LuTrash2,
	LuType,
} from "react-icons/lu";

import { Button } from "@workspace/ui/components/button";
import { ButtonGroup } from "@workspace/ui/components/button-group";
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
	DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { SearchInput } from "@workspace/ui/components/search-input";
import { Separator } from "@workspace/ui/components/separator";
import { useToast } from "@workspace/ui/hooks/use-toast";
import { cn } from "@workspace/ui/lib/utils";

import { CardTransition } from "@workspace/app-ui/components/ext/card-transition";
import type { HomeProps, ShareItem } from "@workspace/app-ui/types/home";

import { useColumns } from "./columns";
import { DeleteBulkDialog, DeleteItemDialog } from "./dialogs";
import { useShareData } from "./hooks";
import { useFileSearch } from "./use-search";

const ROW_HEIGHT = 48;
const OVERSCAN_COUNT = 8;

const COLUMN_CONFIG = {
	select: { minWidth: 40, flex: 0 },
	name: { minWidth: 150, flex: 3 },
	from: { minWidth: 70, flex: 0.5 },
	device: { minWidth: 120, flex: 1 },
	size: { minWidth: 80, flex: 0.5 },
	status: { minWidth: 90, flex: 0.5 },
	uploadedAt: { minWidth: 140, flex: 1 },
	actions: { minWidth: 80, flex: 0.5 },
} as const;

type ColumnId = keyof typeof COLUMN_CONFIG;

interface VirtualRowProps {
	row: ReturnType<ReturnType<typeof useReactTable<ShareItem>>["getRowModel"]>["rows"][number];
	virtualStart: number;
	isSelected: boolean;
	onItemClick: (id: number) => void;
	onItemReveal: (id: number) => void;
	handleCopyFilename: (id: number) => void;
	handleItemDelete: (id: number) => void;
}

const VirtualRow = memo(
	function VirtualRow({
		row,
		virtualStart,
		isSelected,
		onItemClick,
		onItemReveal,
		handleCopyFilename,
		handleItemDelete,
	}: VirtualRowProps) {
		return (
			<ContextMenu>
				<ContextMenuTrigger asChild>
					<div
						role="row"
						onClick={() => onItemClick(row.original.id)}
						data-state={isSelected ? "selected" : undefined}
						className="hover:bg-muted/50 data-[state=selected]:bg-muted absolute left-0 flex items-center border-b border-border transition-colors"
						style={{
							height: `${ROW_HEIGHT}px`,
							transform: `translateY(${virtualStart}px)`,
							willChange: "transform",
							width: "100%",
						}}
					>
						{row.getVisibleCells().map((cell) => {
							const columnId = cell.column.id as ColumnId;
							const config = COLUMN_CONFIG[columnId] ?? { minWidth: 50, flex: 1 };

							return (
								<div
									key={cell.id}
									role="cell"
									className="flex items-center px-2 shrink-0 overflow-hidden"
									style={{
										flex: `${config.flex} 1 0%`,
										minWidth: `${config.minWidth}px`,
										height: `${ROW_HEIGHT}px`,
									}}
								>
									{flexRender(cell.column.columnDef.cell, cell.getContext())}
								</div>
							);
						})}
					</div>
				</ContextMenuTrigger>
				<ContextMenuContent className="w-52">
					<ContextMenuItem>
						<LuFile className="mr-2 h-4 w-4" />
						คัดลอกไฟล์
					</ContextMenuItem>
					<ContextMenuItem onSelect={() => handleCopyFilename(row.original.id)}>
						<LuType className="mr-2 h-4 w-4" />
						คัดลอกชื่อไฟล์
					</ContextMenuItem>
					<ContextMenuSeparator />
					<ContextMenuItem onSelect={() => onItemReveal(row.original.id)}>
						<LuFolderInput className="mr-2 h-4 w-4" />
						เปิดตำแหน่งไฟล์
					</ContextMenuItem>
					<ContextMenuSeparator />
					<ContextMenuItem variant="destructive" onSelect={() => handleItemDelete(row.original.id)}>
						<LuTrash2 className="mr-2 h-4 w-4" />
						ลบ
					</ContextMenuItem>
				</ContextMenuContent>
			</ContextMenu>
		);
	},
	(prev, next) => {
		return (
			prev.isSelected === next.isSelected &&
			prev.row.original === next.row.original &&
			prev.virtualStart === next.virtualStart
		);
	},
);

export function HomeUI({ onItemClick, onItemReveal, onItemRemove, data, loading: externalLoading, invoke }: HomeProps) {
	const { items, loading, refreshData, setItems } = useShareData({ data, externalLoading });

	const [deleteItemId, setDeleteItemId] = useState<number | null>(null);
	const [deleteBulkIds, setDeleteBulkIds] = useState<number[]>([]);
	const [sorting, setSorting] = useState<SortingState>([]);
	const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

	const { toast } = useToast();
	const scrollContainerRef = useRef<HTMLDivElement>(null);

	const rustSearchFn = useMemo(() => {
		if (!invoke) return undefined;
		return async (searchItems: ShareItem[], query: string, threshold: number) => {
			const result = await invoke<{ items: ShareItem[] }>("search_items", {
				items: searchItems,
				query,
				threshold,
			});
			return result.items;
		};
	}, [invoke]);

	const { query, setQuery, filteredItems, isSearching, clearSearch, searchTimeMs } = useFileSearch({
		items,
		rustSearch: rustSearchFn,
		debounceMs: 150,
	});

	const handleItemClick = useCallback(
		(id: number) => {
			onItemClick?.(id);
		},
		[onItemClick],
	);

	const handleItemReveal = useCallback(
		(id: number) => {
			onItemReveal?.(id);
		},
		[onItemReveal],
	);

	const handleItemDelete = useCallback((id: number) => {
		setDeleteItemId(id);
	}, []);

	const columns = useColumns({
		onItemReveal,
		onItemDelete: handleItemDelete,
	});

	const table = useReactTable({
		data: filteredItems,
		columns,
		state: {
			sorting,
			rowSelection,
		},
		onSortingChange: setSorting,
		onRowSelectionChange: setRowSelection,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		enableRowSelection: true,
		getRowId: (row) => String(row.id),
	});

	const { rows } = table.getRowModel();

	const virtualizer = useVirtualizer({
		count: rows.length,
		getScrollElement: () => scrollContainerRef.current,
		estimateSize: useCallback(() => ROW_HEIGHT, []),
		overscan: OVERSCAN_COUNT,
	});

	const virtualItems = virtualizer.getVirtualItems();
	const totalHeight = virtualizer.getTotalSize();

	useEffect(() => {
		virtualizer.scrollToOffset(0);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [query]);

	const selectedRowCount = table.getSelectedRowModel().rows.length;

	const handleCopyFilename = useCallback(
		(id: number) => {
			const item = items.find((item) => item.id === id);
			if (item) {
				window.navigator.clipboard.writeText(item.name);
				toast("คัดลอกชื่อไฟล์แล้ว");
			}
		},
		[items, toast],
	);

	const handleCopyFiles = useCallback(() => {
		const ids = table.getSelectedRowModel().rows.map((r) => r.original.id);
		console.log("Copy files with ids:", ids);
	}, [table]);

	const handleBulkDelete = useCallback(() => {
		const ids = table.getSelectedRowModel().rows.map((r) => r.original.id);
		setDeleteBulkIds(ids);
	}, [table]);

	const handleConfirmDelete = useCallback(async () => {
		if (deleteItemId !== null) {
			const idToDelete = deleteItemId;
			setDeleteItemId(null);

			setTimeout(async () => {
				await onItemRemove(idToDelete);
				toast("ลบรายการเรียบร้อยแล้ว");
			}, 200);
		}
	}, [deleteItemId, onItemRemove, toast]);

	const handleConfirmBulkDelete = useCallback(async () => {
		const idsToDelete = [...deleteBulkIds];
		setDeleteBulkIds([]);
		setRowSelection({});

		setTimeout(async () => {
			const idsSet = new Set(idsToDelete);
			await Promise.all(idsToDelete.map((id) => onItemRemove(id)));
			setItems((prev) => prev.filter((item) => !idsSet.has(item.id)));

			toast(`ลบ ${idsToDelete.length} รายการเรียบร้อยแล้ว`);
		}, 200);
	}, [deleteBulkIds, setItems, toast, onItemRemove]);

	return (
		<div className="h-full flex flex-col">
			<CardTransition className="h-full flex flex-col gap-0" tag="home-card">
				<CardHeader>
					<div className="space-y-1">
						<CardTitle>ประวัติการแชร์</CardTitle>
						<CardDescription>ประวัติการแชร์ไฟล์ของคุณจะแสดงที่นี่</CardDescription>
					</div>
					<div className="flex">
						<div className="flex items-center gap-2">
							<Button variant="outline" onClick={refreshData}>
								<LuRefreshCcw />
							</Button>
							<Button variant="outline" onClick={handleCopyFiles} disabled={selectedRowCount === 0}>
								<LuCopy />
							</Button>
							<Button
								variant="destructive"
								size="sm"
								onClick={handleBulkDelete}
								disabled={selectedRowCount === 0}
							>
								<LuTrash2 />
							</Button>
						</div>
						<div className="flex items-center ms-auto gap-2">
							{isSearching && <LuLoader className="w-4 h-4 animate-spin text-muted-foreground" />}
							<SearchInput
								searchQuery={query}
								onSearchQuery={setQuery}
								onClearSearch={clearSearch}
								className="w-64"
							/>
							<ButtonGroup>
								<Button>แชร์ไฟล์</Button>
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button size="icon" aria-label="More Options">
											<LuChevronDown />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end" className="w-52">
										<DropdownMenuGroup>
											<DropdownMenuItem>
												<LuGlobe />
												แชร์แบบสาธารณะ
											</DropdownMenuItem>
										</DropdownMenuGroup>
									</DropdownMenuContent>
								</DropdownMenu>
							</ButtonGroup>
						</div>
					</div>
					<Separator />
				</CardHeader>

				<CardContent className="flex-1 min-h-0 flex flex-col overflow-hidden">
					<div className="shrink-0 border-b border-border bg-card">
						<div className="flex items-center" style={{ width: "100%", height: `${ROW_HEIGHT}px` }}>
							{table.getHeaderGroups().map((headerGroup) =>
								headerGroup.headers.map((header) => {
									const columnId = header.id as ColumnId;
									const config = COLUMN_CONFIG[columnId] ?? { minWidth: 50, flex: 1 };

									return (
										<div
											key={header.id}
											role="columnheader"
											className="flex items-center px-2 shrink-0 text-sm font-medium text-muted-foreground [&:not(:first-child):not(:last-child)]:hover:bg-muted [&:not(:first-child):not(:last-child)]:cursor-pointer transition-colors"
											style={{
												flex: `${config.flex} 1 0%`,
												minWidth: `${config.minWidth}px`,
												height: `${ROW_HEIGHT}px`,
											}}
										>
											{header.isPlaceholder
												? null
												: flexRender(header.column.columnDef.header, header.getContext())}
										</div>
									);
								}),
							)}
						</div>
					</div>

					<div
						ref={scrollContainerRef}
						className={cn(
							"flex-1 overflow-auto",
							"[&::-webkit-scrollbar]:w-2.5",
							"[&::-webkit-scrollbar-track]:bg-transparent",
							"[&::-webkit-scrollbar-thumb]:bg-primary/60 [&::-webkit-scrollbar-thumb]:rounded-full",
							"[&::-webkit-scrollbar-thumb]:border [&::-webkit-scrollbar-thumb]:border-transparent [&::-webkit-scrollbar-thumb]:bg-clip-padding",
							"hover:[&::-webkit-scrollbar-thumb]:bg-primary/80",
							"transition-colors",
						)}
						style={{ contain: "strict" }}
					>
						{loading ? (
							<div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
								<LuLoader className="w-4 h-4 animate-spin" /> กำลังโหลด
							</div>
						) : rows.length === 0 ? (
							<div className="flex items-center justify-center py-8 text-muted-foreground">
								ไม่มีรายการ
							</div>
						) : (
							<div
								role="table"
								className="relative"
								style={{ height: `${totalHeight}px`, width: "100%" }}
							>
								{virtualItems.map((virtualItem) => {
									const row = rows[virtualItem.index];
									if (!row) return null;

									return (
										<VirtualRow
											key={row.id}
											row={row}
											virtualStart={virtualItem.start}
											isSelected={row.getIsSelected()}
											onItemClick={handleItemClick}
											onItemReveal={handleItemReveal}
											handleCopyFilename={handleCopyFilename}
											handleItemDelete={handleItemDelete}
										/>
									);
								})}
							</div>
						)}
					</div>

					<div className="flex text-sm text-muted-foreground pt-4 gap-2 border-t shrink-0">
						<p>{filteredItems.length} รายการ</p>
						{selectedRowCount > 0 && <p>({selectedRowCount} รายการที่เลือก)</p>}
						{searchTimeMs > 0 && <p className="ml-auto text-xs">ค้นหาใน {searchTimeMs.toFixed(1)}ms</p>}
					</div>
				</CardContent>
			</CardTransition>

			<DeleteItemDialog
				open={deleteItemId !== null}
				onOpenChange={(open) => !open && setDeleteItemId(null)}
				onConfirm={handleConfirmDelete}
			/>

			<DeleteBulkDialog
				open={deleteBulkIds.length > 0}
				itemCount={deleteBulkIds.length}
				onOpenChange={(open) => !open && setDeleteBulkIds([])}
				onConfirm={handleConfirmBulkDelete}
			/>
		</div>
	);
}

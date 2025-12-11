import { useState, useEffect, useMemo, useCallback, useDeferredValue } from "react";
import {
	type RowSelectionState,
	type SortingState,
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
	useReactTable,
} from "@tanstack/react-table";
import {
	LuChevronDown,
	LuChevronLeft,
	LuChevronRight,
	LuDownload,
	LuGlobe,
	LuLoader,
	LuRefreshCcw,
	LuTrash2,
} from "react-icons/lu";

import { Button } from "@workspace/ui/components/button";
import { ButtonGroup } from "@workspace/ui/components/button-group";
import { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@workspace/ui/components/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { SearchInput } from "@workspace/ui/components/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";

import { CardTransition } from "@workspace/app-ui/components/ext/card-transition";
import type { HomeProps, ShareItem, Status } from "@workspace/app-ui/types/home";

import { ITEMS_PER_PAGE } from "./constants";
import { useColumns } from "./columns";
import { DeleteItemDialog, DeleteBulkDialog } from "./dialogs";
import { useShareData } from "./hooks";

export function HomeUI({ onItemClick, onItemReveal, onItemRemove, data, loading: externalLoading }: HomeProps) {
	const { items, loading, refreshData, setItems } = useShareData({ data, externalLoading });

	const [deleteItemId, setDeleteItemId] = useState<number | null>(null);
	const [deleteBulkItems, setDeleteBulkItems] = useState<ShareItem[]>([]);
	const [query, setQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
	const deferredQuery = useDeferredValue(query);
	const [currentPage, setCurrentPage] = useState(1);

	const [sorting, setSorting] = useState<SortingState>([]);
	const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

	const filteredItems = useMemo(() => {
		const trimmedQuery = deferredQuery.trim().toLowerCase();

		return items.filter((item) => {
			if (statusFilter !== "all" && item.status !== statusFilter) {
				return false;
			}

			if (trimmedQuery) {
				return (
					item.name.toLowerCase().includes(trimmedQuery) ||
					item.device?.toLowerCase().includes(trimmedQuery) ||
					item.friendName?.toLowerCase().includes(trimmedQuery)
				);
			}

			return true;
		});
	}, [items, deferredQuery, statusFilter]);

	const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));

	const paginatedItems = useMemo(() => {
		const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
		return filteredItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);
	}, [filteredItems, currentPage]);

	useEffect(() => {
		setCurrentPage(1);
	}, [deferredQuery, statusFilter]);

	const handleItemDelete = useCallback((id: number) => {
		setDeleteItemId(id);
	}, []);

	const columns = useColumns({
		onItemReveal,
		onItemDelete: handleItemDelete,
	});

	const table = useReactTable({
		data: paginatedItems,
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

	const selectedIds = useMemo(() => {
		const ids = new Set<number>();
		table.getSelectedRowModel().rows.forEach((r) => ids.add(r.original.id));
		return ids;
	}, [table, rowSelection]);

	const handleClearFilters = useCallback(() => {
		setQuery("");
		setStatusFilter("all");
		setRowSelection({});
	}, []);

	const handleBulkDelete = useCallback(() => {
		const itemsToDelete = paginatedItems.filter((item) => selectedIds.has(item.id));
		setDeleteBulkItems(itemsToDelete);
	}, [paginatedItems, selectedIds]);

	const handleBulkDownload = useCallback(() => {
		console.log("Downloading items:", Array.from(selectedIds));
		setRowSelection({});
	}, [selectedIds]);

	const handleConfirmDelete = useCallback(async () => {
		if (deleteItemId) {
			await onItemRemove(deleteItemId);
			setDeleteItemId(null);
		}
	}, [deleteItemId, onItemRemove]);

	const handleConfirmBulkDelete = useCallback(() => {
		const idsToDelete = new Set(deleteBulkItems.map((item) => item.id));
		setItems((prev) => prev.filter((item) => !idsToDelete.has(item.id)));
		setDeleteBulkItems([]);
		setRowSelection({});
	}, [deleteBulkItems, setItems]);

	return (
		<div className="h-full">
			<CardTransition className="h-full" tag="home-card">
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
							<SearchInput
								placeholder="ค้นหา..."
								searchQuery={query}
								onSearchQuery={setQuery}
								onClearSearch={() => setQuery("")}
								className="w-64"
							/>
							<Select
								value={statusFilter}
								onValueChange={(value: Status | "all") => setStatusFilter(value)}
							>
								<SelectTrigger className="w-[180px]">
									<SelectValue placeholder="สถานะทั้งหมด" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">ทั้งหมด</SelectItem>
									<SelectItem value="success">สำเร็จ</SelectItem>
									<SelectItem value="processing">กำลังประมวลผล</SelectItem>
									<SelectItem value="failed">ล้มเหลว</SelectItem>
								</SelectContent>
							</Select>
							<Button variant="outline" onClick={handleClearFilters}>
								ล้างตัวกรอง
							</Button>
						</div>
						{selectedIds.size > 0 && (
							<div className="flex items-center gap-2 ms-auto">
								<span>{selectedIds.size} รายการที่เลือก</span>
								<Button variant="outline" size="sm" onClick={handleBulkDownload}>
									<LuDownload />
								</Button>
								<Button variant="destructive" size="sm" onClick={handleBulkDelete}>
									<LuTrash2 />
								</Button>
							</div>
						)}
						<div className="flex items-center ms-auto">
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
				</CardHeader>
				<CardContent className="flex-1 flex flex-col">
					<div className="h-full rounded-lg border overflow-clip dark:border-secondary">
						<Table>
							<TableHeader>
								{table.getHeaderGroups().map((headerGroup) => (
									<TableRow
										key={headerGroup.id}
										className="bg-secondary/50 hover:bg-secondary/50 dark:bg-secondary"
									>
										{headerGroup.headers.map((header) => (
											<TableHead key={header.id} style={{ width: `${header.getSize()}px` }}>
												{header.isPlaceholder
													? null
													: flexRender(header.column.columnDef.header, header.getContext())}
											</TableHead>
										))}
									</TableRow>
								))}
							</TableHeader>
							<TableBody>
								{loading ? (
									<TableRow>
										<TableCell colSpan={columns.length}>
											<div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
												<LuLoader className="w-4 h-4 animate-spin" /> กำลังโหลด
											</div>
										</TableCell>
									</TableRow>
								) : table.getRowModel().rows.length === 0 ? (
									<TableRow>
										<TableCell colSpan={columns.length} className="text-center py-8">
											ไม่มีรายการ
										</TableCell>
									</TableRow>
								) : (
									table.getRowModel().rows.map((row) => (
										<TableRow key={row.id} onClick={() => onItemClick(row.original.id)}>
											{row.getVisibleCells().map((cell) => (
												<TableCell key={cell.id}>
													{flexRender(cell.column.columnDef.cell, cell.getContext())}
												</TableCell>
											))}
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
					</div>
				</CardContent>
				<CardFooter className="flex items-center justify-between text-sm text-muted-foreground">
					<div>
						แสดง {paginatedItems.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1} -{" "}
						{(currentPage - 1) * ITEMS_PER_PAGE + paginatedItems.length} จาก {filteredItems.length}
					</div>
					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
							disabled={currentPage === 1}
							aria-label="Previous page"
						>
							<LuChevronLeft className="w-4 h-4" />
						</Button>
						<span aria-live="polite">
							หน้า {currentPage} / {totalPages}
						</span>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
							disabled={currentPage === totalPages}
							aria-label="Next page"
						>
							<LuChevronRight className="w-4 h-4" />
						</Button>
					</div>
				</CardFooter>
			</CardTransition>

			<DeleteItemDialog
				open={deleteItemId !== null}
				onOpenChange={(open) => !open && setDeleteItemId(null)}
				onConfirm={handleConfirmDelete}
			/>

			<DeleteBulkDialog
				open={deleteBulkItems.length > 0}
				items={deleteBulkItems}
				onOpenChange={(open) => !open && setDeleteBulkItems([])}
				onConfirm={handleConfirmBulkDelete}
			/>
		</div>
	);
}

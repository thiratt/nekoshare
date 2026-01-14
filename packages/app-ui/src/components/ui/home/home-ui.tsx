import { useCallback, useDeferredValue, useMemo, useState } from "react";

import {
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
	type RowSelectionState,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import { LuChevronDown, LuCopy, LuGlobe, LuLoader, LuRefreshCcw, LuTrash2 } from "react-icons/lu";

import { Button } from "@workspace/ui/components/button";
import { ButtonGroup } from "@workspace/ui/components/button-group";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { ScrollArea, ScrollBar } from "@workspace/ui/components/scroll-area";
import { SearchInput } from "@workspace/ui/components/search-input";
import { Separator } from "@workspace/ui/components/separator";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";

import { CardTransition } from "@workspace/app-ui/components/ext/card-transition";
import type { HomeProps } from "@workspace/app-ui/types/home";

import { useColumns } from "./columns";
import { DeleteBulkDialog, DeleteItemDialog } from "./dialogs";
import { useShareData } from "./hooks";

export function HomeUI({ onItemClick, onItemReveal, onItemRemove, data, loading: externalLoading }: HomeProps) {
	const { items, loading, refreshData, setItems } = useShareData({ data, externalLoading });

	const [deleteItemId, setDeleteItemId] = useState<number | null>(null);
	const [deleteBulkIds, setDeleteBulkIds] = useState<number[]>([]);
	const [query, setQuery] = useState("");
	const deferredQuery = useDeferredValue(query);

	const [sorting, setSorting] = useState<SortingState>([]);
	const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

	const filteredItems = useMemo(() => {
		const trimmedQuery = deferredQuery.trim().toLowerCase();
		if (!trimmedQuery) return items;

		return items.filter((item) => {
			if (trimmedQuery) {
				return (
					item.name.toLowerCase().includes(trimmedQuery) ||
					item.device?.toLowerCase().includes(trimmedQuery) ||
					item.friendName?.toLowerCase().includes(trimmedQuery)
				);
			}

			return true;
		});
	}, [items, deferredQuery]);

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

	const selectedRowCount = table.getSelectedRowModel().rows.length;

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
			await onItemRemove(deleteItemId);
			setDeleteItemId(null);
		}
	}, [deleteItemId, onItemRemove]);

	const handleConfirmBulkDelete = useCallback(async () => {
		const idsToDelete = new Set(deleteBulkIds);
		await Promise.all(deleteBulkIds.map((id) => onItemRemove(id)));
		setItems((prev) => prev.filter((item) => !idsToDelete.has(item.id)));
		setDeleteBulkIds([]);
		setRowSelection({});
	}, [deleteBulkIds, setItems, onItemRemove]);

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
							<SearchInput
								searchQuery={query}
								onSearchQuery={setQuery}
								onClearSearch={() => setQuery("")}
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
					<ScrollArea className="flex-1">
						<table className="w-full text-sm caption-bottom text-left border-collapse">
							<TableHeader className="sticky top-0 z-10 bg-card">
								{table.getHeaderGroups().map((headerGroup) => (
									<TableRow key={headerGroup.id} className="hover:bg-transparent border-none">
										{headerGroup.headers.map((header) => (
											<TableHead
												key={header.id}
												className="[&:not(:first-child):not(:last-child)]:hover:bg-muted [&:not(:first-child):not(:last-child)]:cursor-pointer transition-colors"
												style={{ width: `${header.getSize()}px` }}
											>
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
						</table>
						<ScrollBar className="z-20" barClassname="bg-primary" />
						<ScrollBar orientation="horizontal" barClassname="bg-primary" />
					</ScrollArea>

					<div className="flex text-sm text-muted-foreground pt-4 gap-2 border-t">
						<p>{filteredItems.length} รายการ</p>
						{selectedRowCount > 0 && <p>({selectedRowCount} รายการที่เลือก)</p>}
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

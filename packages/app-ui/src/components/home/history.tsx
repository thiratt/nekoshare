import * as React from "react";
import {
	ColumnDef,
	ColumnFiltersState,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	SortingState,
	useReactTable,
	VisibilityState,
} from "@tanstack/react-table";

import { ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { TableHeader, TableRow, TableHead, TableBody, TableCell, Table } from "@workspace/ui/components/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { SearchInput } from "@workspace/ui/components/search-input";
import { Copy } from "lucide-react";

const data: Transfer[] = [
	{
		id: "1",
		device: "Acer Nitro v15",
		action: "Upload",
		status: "success",
		date: "2025-03-03T20:35:00",
	},
	{
		id: "2",
		device: "Chrome 136",
		action: "Download",
		status: "failed",
		date: "2025-03-02T20:35:00",
	},
	{
		id: "3",
		device: "Redmi Note 12 4G",
		action: "Upload",
		status: "success",
		date: "2025-03-01T20:35:00",
	},
];

export type TransferStatus = "processing" | "success" | "failed";

export interface Transfer {
	id: string;
	device: string;
	action: "Upload" | "Download";
	status: TransferStatus;
	date: string; // ISO
}

export const columns: ColumnDef<Transfer>[] = [
	{
		accessorKey: "device",
		header: "อุปกรณ์",
		cell: ({ row }) => <div className="capitalize">{row.getValue("device")}</div>,
	},
	{
		accessorKey: "action",
		header: "กระดำเนินการ",
		cell: ({ row }) => <div className="capitalize">{row.getValue("action")}</div>,
	},
	{
		accessorKey: "date",
		header: ({ column }) => {
			return (
				<Button
					className="text-start p-0"
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
				>
					วันที่
					<ArrowUpDown className="ml-2 h-4 w-4" />
				</Button>
			);
		},
		cell: ({ row }) => {
			const date = new Date(row.getValue("date"));
			return <div>{date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</div>;
		},
		sortingFn: "datetime",
	},
	{
		accessorKey: "status",
		header: "สถานะ",
		cell: ({ row }) => {
			const status = row.getValue("status") as string;
			let variant: "default" | "secondary" | "destructive" | "outline" = "default";
			if (status === "success") variant = "default";
			if (status === "failed") variant = "destructive";
			if (status === "processing") variant = "secondary";

			const toThai = (status: string): string => {
				switch (status) {
					case "success":
						return "สำเร็จ";
					case "failed":
						return "ล้มมเหลว";
					case "processing":
						return "กำลังดำเนินการ";

					default:
						return status;
				}
			};
			return <Badge variant={variant}>{toThai(status)}</Badge>;
		},
	},
];

export function HistoryUI() {
	const [sorting, setSorting] = React.useState<SortingState>([]);
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
	const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
	const [globalFilter, setGlobalFilter] = React.useState("");

	const table = useReactTable({
		data,
		columns,
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		onColumnVisibilityChange: setColumnVisibility,
		state: {
			sorting,
			columnFilters,
			columnVisibility,
			globalFilter,
		},
		globalFilterFn: "includesString",
		onGlobalFilterChange: setGlobalFilter,
	});

	const { pageIndex, pageSize } = table.getState().pagination;
	const totalRows = table.getFilteredRowModel().rows.length;
	const currentPage = pageIndex + 1;
	const totalPages = table.getPageCount();
	const pageStart = pageIndex * pageSize + 1;
	const pageEnd = Math.min(pageStart + pageSize - 1, totalRows);

	return (
		<Card className="h-[calc(100vh-8rem)]">
			<CardHeader className="flex items-start sm:items-center justify-between gap-4">
				<div className="space-y-1">
					<CardTitle>ประวัติการแชร์ข้อมูล</CardTitle>
					<CardDescription>อยากรู้มั้ยว่าในแต่ละวันเราส่งอะไรบ้าง</CardDescription>
				</div>

				<div className="flex flex-col sm:flex-row gap-2 sm:items-center">
					<SearchInput
						searchQuery={globalFilter ?? ""}
						onSearchQuery={(v) => setGlobalFilter(v)}
						className="max-w-sm"
						onClearSearch={() => setGlobalFilter("")}
					/>
				</div>
			</CardHeader>
			<CardContent className="flex flex-col h-full">
				<div className="flex-1 rounded-md border">
					{table.getRowModel().rows?.length ? (
						<Table>
							<TableHeader className="bg-muted/50">
								{table.getHeaderGroups().map((headerGroup) => (
									<TableRow key={headerGroup.id}>
										{headerGroup.headers.map((header) => {
											return (
												<TableHead key={header.id} className="px-4">
													{header.isPlaceholder
														? null
														: flexRender(
																header.column.columnDef.header,
																header.getContext()
															)}
												</TableHead>
											);
										})}
									</TableRow>
								))}
							</TableHeader>
							<TableBody>
								{table.getRowModel().rows.map((row) => (
									<TableRow className="h-12" key={row.id}>
										{row.getVisibleCells().map((cell) => (
											<TableCell key={cell.id} className="px-4 py-2 border-b">
												{flexRender(cell.column.columnDef.cell, cell.getContext())}
											</TableCell>
										))}
									</TableRow>
								))}
							</TableBody>
						</Table>
					) : (
						<div className="h-full flex items-center justify-center">
							<div className="flex flex-col items-center space-y-2 text-muted-foreground">
								<Copy className="w-8 h-8" />
								<p>No transfers found</p>
								<p className="text-sm">Share some files to see history here</p>
							</div>
						</div>
					)}
				</div>

				<div className="flex items-center justify-between space-x-2 py-3">
					<span className="text-sm text-muted-foreground">
						Showing {pageStart}-{pageEnd} of {totalRows}
					</span>
					<div className="space-x-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => table.previousPage()}
							disabled={!table.getCanPreviousPage()}
						>
							<ChevronLeft className="w-4 h-4" />
						</Button>
						<span className="text-sm text-muted-foreground">
							Page {currentPage} / {totalPages}
						</span>
						<Button
							variant="outline"
							size="sm"
							onClick={() => table.nextPage()}
							disabled={!table.getCanNextPage()}
						>
							<ChevronRight className="w-4 h-4" />
						</Button>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

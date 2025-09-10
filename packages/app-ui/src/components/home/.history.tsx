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

import { ArrowUpDown, ChevronDown, MoreHorizontal } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuCheckboxItem,
} from "@workspace/ui/components/dropdown-menu";
import { Input } from "@workspace/ui/components/input";
import { TableHeader, TableRow, TableHead, TableBody, TableCell, Table } from "@workspace/ui/components/table";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge"; // Assuming Badge component exists in your UI library for status styling

const data: Payment[] = [
	{
		id: "1",
		device: "Tyler Windows",
		action: "Login",
		status: "success",
		date: "2025-03-01T20:35:00", // Changed to ISO format for proper sorting
	},
	{
		id: "2",
		device: "Chrome",
		action: "Login",
		status: "success",
		date: "2025-03-01T20:35:00", // Changed to ISO format for proper sorting
	},
	// Add more data as needed for testing
];

export type Payment = {
	id: string;
	device: string;
	action: string;
	date: string; // ISO string for sorting
	status: "processing" | "success" | "failed";
};

export const columns: ColumnDef<Payment>[] = [
	{
		accessorKey: "device",
		header: "Device",
		cell: ({ row }) => <div className="capitalize">{row.getValue("device")}</div>,
	},
	{
		accessorKey: "action",
		header: "Action",
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
					Date
					<ArrowUpDown className="ml-2 h-4 w-4" />
				</Button>
			);
		},
		cell: ({ row }) => {
			const date = new Date(row.getValue("date"));
			return <div>{date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</div>;
		},
		sortingFn: "datetime", // Use built-in datetime sorting
	},
	{
		accessorKey: "status",
		header: "Status",
		cell: ({ row }) => {
			const status = row.getValue("status") as string;
			let variant: "default" | "secondary" | "destructive" | "outline" = "default";
			if (status === "success") variant = "default"; // Assuming default is green
			if (status === "failed") variant = "destructive";
			if (status === "processing") variant = "secondary";
			return <Badge variant={variant}>{status.toUpperCase()}</Badge>;
		},
	},
	// {
	// 	id: "actions",
	// 	enableHiding: false,
	// 	cell: ({ row }) => {
	// 		const payment = row.original;

	// 		return (
	// 			<DropdownMenu>
	// 				<DropdownMenuTrigger asChild>
	// 					<Button variant="ghost" className="h-8 w-8 p-0">
	// 						<span className="sr-only">Open menu</span>
	// 						<MoreHorizontal className="h-4 w-4" />
	// 					</Button>
	// 				</DropdownMenuTrigger>
	// 				<DropdownMenuContent align="end">
	// 					<DropdownMenuLabel>Actions</DropdownMenuLabel>
	// 					<DropdownMenuItem onClick={() => navigator.clipboard.writeText(payment.id)}>
	// 						Copy ID
	// 					</DropdownMenuItem>
	// 					<DropdownMenuSeparator />
	// 					<DropdownMenuItem>View details</DropdownMenuItem>
	// 				</DropdownMenuContent>
	// 			</DropdownMenu>
	// 		);
	// 	},
	// },
];

export function HistoryUI() {
	const [sorting, setSorting] = React.useState<SortingState>([]);
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
	const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
	const [rowSelection, setRowSelection] = React.useState({});
	const [globalFilter, setGlobalFilter] = React.useState(""); // Added global filter for better UX

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
		onRowSelectionChange: setRowSelection,
		state: {
			sorting,
			columnFilters,
			columnVisibility,
			rowSelection,
			globalFilter, // Enable global filtering
		},
		globalFilterFn: "includesString", // Use includesString for global filter
		onGlobalFilterChange: setGlobalFilter,
	});

	return (
		<Card className="h-[calc(100vh-8rem)]">
			<CardContent className="flex flex-col h-full">
				<div className="flex items-center py-4 gap-4">
					<Input
						placeholder="Search history..."
						value={globalFilter ?? ""}
						onChange={(event) => setGlobalFilter(event.target.value)}
						className="max-w-sm"
					/>
				</div>
				<div className="flex-1 overflow-auto rounded-md border">
					{/* Changed to overflow-auto for responsiveness */}
					<Table>
						<TableHeader>
							{table.getHeaderGroups().map((headerGroup) => (
								<TableRow key={headerGroup.id}>
									{headerGroup.headers.map((header) => {
										return (
											<TableHead key={header.id} className="px-4">
												{header.isPlaceholder
													? null
													: flexRender(header.column.columnDef.header, header.getContext())}
											</TableHead>
										);
									})}
								</TableRow>
							))}
						</TableHeader>
						<TableBody>
							{table.getRowModel().rows?.length ? (
								table.getRowModel().rows.map((row) => (
									<TableRow
										className="h-12"
										key={row.id}
										data-state={row.getIsSelected() && "selected"}
									>
										{row.getVisibleCells().map((cell) => (
											<TableCell key={cell.id} className="px-4 py-2 border-b">
												{flexRender(cell.column.columnDef.cell, cell.getContext())}
											</TableCell>
										))}
									</TableRow>
								))
							) : (
								<TableRow>
									<TableCell colSpan={columns.length} className="h-24 text-center">
										No results found.
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</div>
				<div className="flex items-center justify-end space-x-2 py-4">
					{/* <div className="text-muted-foreground flex-1 text-sm">
						{table.getFilteredSelectedRowModel().rows.length} of {table.getFilteredRowModel().rows.length}{" "}
						row(s) selected.
					</div> */}
					<div className="space-x-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => table.previousPage()}
							disabled={!table.getCanPreviousPage()}
						>
							Previous
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() => table.nextPage()}
							disabled={!table.getCanNextPage()}
						>
							Next
						</Button>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

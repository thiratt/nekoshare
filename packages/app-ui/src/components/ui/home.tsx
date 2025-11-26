import { useState, useEffect, useMemo, useCallback, useDeferredValue, memo } from "react";

import {
	LuChevronDown,
	LuChevronLeft,
	LuChevronRight,
	LuCircleAlert,
	LuCircleCheck,
	LuClock,
	LuDownload,
	LuFolderInput,
	LuGlobe,
	LuLoader,
	LuRefreshCcw,
	LuTrash2,
} from "react-icons/lu";
import {
	type ColumnDef,
	type SortingState,
	type RowSelectionState,
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { CardTitle, CardContent, CardHeader, Card, CardFooter, CardDescription } from "@workspace/ui/components/card";
import { Button, buttonVariants } from "@workspace/ui/components/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuGroup,
} from "@workspace/ui/components/dropdown-menu";
import { Badge } from "@workspace/ui/components/badge";
import { SearchInput } from "@workspace/ui/components/search-input";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import { ButtonGroup } from "@workspace/ui/components/button-group";

type Status = "success" | "failed" | "processing";

interface ShareItem {
	id: number;
	name: string;
	from: "me" | "buddy";
	device: string | null;
	friendName?: string;
	status: Status;
	uploadedAt: string;
	isReaded: boolean;
	canDownload: boolean;
	size?: string;
	type?: string;
	sharedWith?: number;
}

function useShareData(_data: { filename: string; size: number }[]) {
	const [items, setItems] = useState<ShareItem[]>([]);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		let isMounted = true;
		setLoading(true);

		const timer = setTimeout(() => {
			if (!isMounted) return;

			const now = Date.now();
			setItems([
				{
					id: 1,
					name: "Project Documents.zip",
					from: "me",
					device: "MacBook Pro M2",
					status: "success",
					uploadedAt: new Date(now - 86400e3 * 1).toISOString(),
					isReaded: true,
					canDownload: true,
					size: "2.5 MB",
					type: "zip",
					sharedWith: 3,
				},
				{
					id: 2,
					name: "Meeting Recording.mp4",
					from: "buddy",
					device: null,
					status: "processing",
					uploadedAt: new Date(now - 86400e3 * 2).toISOString(),
					isReaded: false,
					canDownload: false,
					size: "128 MB",
					type: "video",
					sharedWith: 1,
				},
				{
					id: 3,
					name: "Design Assets",
					from: "buddy",
					device: null,
					status: "failed",
					uploadedAt: new Date(now - 86400e3 * 3).toISOString(),
					isReaded: false,
					canDownload: false,
					size: "45 MB",
					type: "folder",
					sharedWith: 0,
				},
				{
					id: 4,
					name: "Report Q4 2024.pdf",
					from: "me",
					device: "Dell XPS 13",
					status: "success",
					uploadedAt: new Date(now - 86400e3 * 5).toISOString(),
					isReaded: true,
					canDownload: true,
					size: "3.2 MB",
					type: "pdf",
					sharedWith: 5,
				},
			]);
			setLoading(false);
		}, 800);

		return () => {
			isMounted = false;
			clearTimeout(timer);
		};
	}, []);

	const refreshData = useCallback(() => {
		setLoading(true);
		const timer = setTimeout(() => setLoading(false), 500);
		return () => clearTimeout(timer);
	}, []);

	return { items, loading, refreshData, setItems };
}

const STATUS_CONFIG = {
	success: {
		icon: LuCircleCheck,
		color: "text-green-600 bg-green-50 dark:text-green-50 dark:bg-green-900",
		label: "สำเร็จ",
	},
	failed: {
		icon: LuCircleAlert,
		color: "text-red-600 bg-red-50 dark:text-red-50 dark:bg-destructive/60",
		label: "ล้มเหลว",
	},
	processing: {
		icon: LuClock,
		color: "text-yellow-600 bg-yellow-50 dark:text-yellow-50 dark:bg-yellow-900",
		label: "กำลังประมวลผล",
	},
} as const;

const StatusBadge = memo(function StatusBadge({ status }: { status: Status }) {
	const { icon: Icon, color, label } = STATUS_CONFIG[status];

	return (
		<Badge className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${color}`}>
			<Icon className="w-3 h-3" />
			{label}
		</Badge>
	);
});

function formatDate(isoString: string) {
	const date = new Date(isoString);
	return date.toLocaleDateString("th-TH", {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

interface HomeProps {
	onItemClick: (id: number) => void;
	onItemDownload: (id: number) => void;
	onBulkDelete: (ids: number[]) => void;
	data: { filename: string; size: number }[];
}

interface DeleteItemDialog {
	id: number;
}

const ITEMS_PER_PAGE = 10;

export function HomeUI({ onItemClick, onItemDownload, data }: HomeProps) {
	const { items, loading, refreshData, setItems } = useShareData(data);

	const [deleteItemDialog, setDeleteItemDialog] = useState<DeleteItemDialog | null>(null);
	const [deleteBulkDialog, setDeleteBulkDialog] = useState<DeleteItemDialog[]>([]);
	const [query, setQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
	const deferredQuery = useDeferredValue(query);
	const [currentPage, setCurrentPage] = useState(1);

	const [myShareSorting, setMyShareSorting] = useState<SortingState>([]);
	const [myShareRowSelection, setMyShareRowSelection] = useState<RowSelectionState>({});

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

	const myShareColumns = useMemo<ColumnDef<ShareItem>[]>(
		() => [
			{
				id: "select",
				header: ({ table }) => (
					<Checkbox
						className="border-foreground"
						checked={
							table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")
						}
						onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
						aria-label="Select all"
					/>
				),
				cell: ({ row }) => (
					<Checkbox
						className="border-foreground"
						onClick={(e) => e.stopPropagation()}
						checked={row.getIsSelected()}
						onCheckedChange={(value) => row.toggleSelected(!!value)}
						aria-label={`Select ${row.original.name}`}
					/>
				),
				size: 40,
				enableSorting: false,
			},
			{
				accessorKey: "name",
				header: "รายการ",
			},
			{
				accessorKey: "from",
				header: "จาก",
				cell: ({ row }) => (row.original.from === "me" ? "ฉัน" : "เพื่อน"),
			},
			{
				accessorKey: "device",
				header: "อุปกรณ์",
				cell: ({ row }) => row.original.device || "-",
			},
			{
				accessorKey: "size",
				header: "ขนาด",
				cell: ({ row }) => row.original.size ?? "-",
			},
			{
				accessorKey: "status",
				header: "สถานะ",
				cell: ({ row }) => <StatusBadge status={row.original.status} />,
			},
			{
				accessorKey: "uploadedAt",
				header: "วันที่",
				sortingFn: (a, b) =>
					new Date(a.original.uploadedAt).getTime() - new Date(b.original.uploadedAt).getTime(),
				cell: ({ row }) => (
					<span className="text-sm text-muted-foreground">{formatDate(row.original.uploadedAt)}</span>
				),
			},
			{
				id: "actions",
				header: "ตัวเลือก",
				enableSorting: false,
				cell: ({ row }) => (
					<div className="flex gap-1">
						{row.original.canDownload && (
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8 hover:bg-primary hover:text-primary-foreground dark:hover:bg-primary"
								onClick={(e) => {
									e.stopPropagation();
									onItemDownload(row.original.id);
								}}
								aria-label="Download item"
							>
								<LuFolderInput className="h-4 w-4" />
							</Button>
						)}
						<Button
							variant="ghost"
							size="icon"
							className="h-8 w-8 hover:bg-destructive hover:text-primary-foreground dark:hover:bg-destructive/60 dark:hover:text-foreground"
							onClick={(e) => {
								e.stopPropagation();
								setDeleteItemDialog({ id: row.original.id });
							}}
							aria-label="Delete item"
						>
							<LuTrash2 className="h-4 w-4" />
						</Button>
					</div>
				),
			},
		],
		[onItemDownload]
	);

	const myShareTable = useReactTable({
		data: paginatedItems,
		columns: myShareColumns,
		state: {
			sorting: myShareSorting,
			rowSelection: myShareRowSelection,
		},
		onSortingChange: setMyShareSorting,
		onRowSelectionChange: setMyShareRowSelection,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		enableRowSelection: true,
		getRowId: (row) => String(row.id),
	});

	const selected = useMemo(() => {
		const ids = new Set<number>();
		myShareTable.getSelectedRowModel().rows.forEach((r) => ids.add(r.original.id));
		return ids;
	}, [myShareRowSelection, myShareTable]);

	const handleClearFilters = useCallback(() => {
		setQuery("");
		setStatusFilter("all");
		setMyShareRowSelection({});
	}, []);

	const handleBulkDelete = useCallback(() => {
		const itemsToDelete = paginatedItems.filter((item) => selected.has(item.id));
		setDeleteBulkDialog(itemsToDelete);
	}, [paginatedItems, selected]);

	const handleBulkDownload = useCallback(() => {
		console.log("Downloading items:", Array.from(selected));
		setMyShareRowSelection({});
	}, [selected]);

	return (
		<div className="h-full">
			<Card className="h-full gap-4">
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
								onSearchQuery={(e) => setQuery(e)}
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
						{selected.size > 0 && (
							<div className="flex items-center gap-2 ms-auto">
								<span>{selected.size} รายการที่เลือก</span>
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
								{myShareTable.getHeaderGroups().map((headerGroup) => (
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
										<TableCell colSpan={myShareColumns.length}>
											<div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
												<LuLoader className="w-4 h-4 animate-spin" /> กำลังโหลด
											</div>
										</TableCell>
									</TableRow>
								) : myShareTable.getRowModel().rows.length === 0 ? (
									<TableRow>
										<TableCell colSpan={myShareColumns.length} className="text-center py-8">
											ไม่มีรายการ
										</TableCell>
									</TableRow>
								) : (
									myShareTable.getRowModel().rows.map((row) => (
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
			</Card>

			{/* Delete confirmation dialog */}
			<AlertDialog
				open={!!deleteItemDialog}
				onOpenChange={(open) => {
					if (!open) setDeleteItemDialog(null);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
						<AlertDialogDescription>
							คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้? การดำเนินการนี้ไม่สามารถย้อนกลับได้.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>ยกเลิก</AlertDialogCancel>
						<AlertDialogAction
							className={buttonVariants({ variant: "destructive" })}
							onClick={() => {
								if (deleteItemDialog) {
									setItems((prev) => prev.filter((item) => item.id !== deleteItemDialog.id));
									setDeleteItemDialog(null);
								}
							}}
						>
							ลบ
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Bulk delete confirmation dialog */}
			<AlertDialog
				open={deleteBulkDialog.length > 0}
				onOpenChange={(open) => {
					if (!open) setDeleteBulkDialog([]);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>ยืนยันการลบหลายรายการ</AlertDialogTitle>
						<AlertDialogDescription>
							คุณแน่ใจหรือไม่ว่าต้องการลบ {deleteBulkDialog.length} รายการที่เลือก?
							การดำเนินการนี้ไม่สามารถย้อนกลับได้.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>ยกเลิก</AlertDialogCancel>
						<AlertDialogAction
							className={buttonVariants({ variant: "destructive" })}
							onClick={() => {
								const idsToDelete = new Set(deleteBulkDialog.map((item) => item.id));
								setItems((prev) => prev.filter((item) => !idsToDelete.has(item.id)));
								setDeleteBulkDialog([]);
							}}
						>
							ลบ {deleteBulkDialog.length} รายการ
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}

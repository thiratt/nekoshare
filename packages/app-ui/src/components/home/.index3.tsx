import * as React from "react";
import {
	AlertCircle,
	CheckCircle,
	ChevronLeft,
	ChevronRight,
	Clock,
	Download,
	Loader2,
	MoreHorizontal,
	RefreshCcw,
	Trash2,
} from "lucide-react";
import {
	type ColumnDef,
	type SortingState,
	type RowSelectionState,
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { CardTitle, CardContent, CardHeader, Card, CardFooter } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tab-animate";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Input } from "@workspace/ui/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { cn } from "@workspace/ui/lib/utils";
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuItem,
	DropdownMenuSeparator,
} from "@workspace/ui/components/dropdown-menu";
import { Badge } from "@workspace/ui/components/badge";

// ---------- Types ----------
type Status = "success" | "failed" | "processing";

interface ShareItem {
	id: number;
	name: string;
	device?: string;
	friendName?: string;
	status: Status;
	uploadedAt: string;
	isReaded: boolean;
	canDownload: boolean;
	size?: string;
	type?: string;
	sharedWith?: number;
}

// ---------- Fake data layer (swap with your real API) ----------
function useShareData(type: "myshare" | "friendshare") {
	const [items, setItems] = React.useState<ShareItem[]>([]);
	const [loading, setLoading] = React.useState(false);

	React.useEffect(() => {
		setLoading(true);
		const timer = setTimeout(() => {
			const now = new Date();

			if (type === "myshare") {
				setItems([
					{
						id: 1,
						name: "Project Documents.zip",
						device: "MacBook Pro M2",
						status: "success",
						uploadedAt: new Date(now.getTime() - 86400e3 * 1).toISOString(),
						isReaded: true,
						canDownload: true,
						size: "2.5 MB",
						type: "zip",
						sharedWith: 3,
					},
					{
						id: 2,
						name: "Meeting Recording.mp4",
						device: "iPhone 15 Pro",
						status: "processing",
						uploadedAt: new Date(now.getTime() - 86400e3 * 2).toISOString(),
						isReaded: false,
						canDownload: false,
						size: "128 MB",
						type: "video",
						sharedWith: 1,
					},
					{
						id: 3,
						name: "Design Assets",
						device: "iPad Pro",
						status: "failed",
						uploadedAt: new Date(now.getTime() - 86400e3 * 3).toISOString(),
						isReaded: false,
						canDownload: false,
						size: "45 MB",
						type: "folder",
						sharedWith: 0,
					},
					{
						id: 4,
						name: "Report Q4 2024.pdf",
						device: "Dell XPS 13",
						status: "success",
						uploadedAt: new Date(now.getTime() - 86400e3 * 5).toISOString(),
						isReaded: true,
						canDownload: true,
						size: "3.2 MB",
						type: "pdf",
						sharedWith: 5,
					},
				]);
			} else {
				setItems([
					{
						id: 5,
						name: "Vacation Photos",
						friendName: "Sarah Chen",
						status: "success",
						uploadedAt: new Date(now.getTime() - 86400e3 * 1).toISOString(),
						isReaded: false,
						canDownload: true,
						size: "156 MB",
						type: "folder",
					},
					{
						id: 6,
						name: "Recipe Collection.docx",
						friendName: "Mike Johnson",
						status: "success",
						uploadedAt: new Date(now.getTime() - 86400e3 * 4).toISOString(),
						isReaded: true,
						canDownload: true,
						size: "1.8 MB",
						type: "document",
					},
				]);
			}
			setLoading(false);
		}, 800);
		return () => clearTimeout(timer);
	}, [type]);

	const refreshData = React.useCallback(() => {
		setLoading(true);
		setTimeout(() => setLoading(false), 500);
	}, []);

	return { items, loading, refreshData, setItems };
}

// ---------- Utilities ----------
function StatusBadge({ status }: { status: Status }) {
	const config = {
		success: {
			icon: CheckCircle,
			color: "text-green-600 bg-green-50 dark:text-green-50 dark:bg-green-900",
			label: "สำเร็จ",
		},
		failed: {
			icon: AlertCircle,
			color: "text-red-600 bg-red-50 dark:text-red-50 dark:bg-destructive/60",
			label: "ล้มเหลว",
		},
		processing: {
			icon: Clock,
			color: "text-yellow-600 bg-yellow-50 dark:text-yellow-50 dark:bg-yellow-900",
			label: "กำลังประมวลผล",
		},
	};

	const { icon: Icon, color, label } = config[status];

	return (
		<Badge className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${color}`}>
			<Icon className="w-3 h-3" />
			{label}
		</Badge>
	);
}

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

function getRowClassName(item: ShareItem, isSelected: boolean) {
	return cn(
		!item.isReaded && !isSelected && "font-bold",
		!item.isReaded && isSelected && "font-bold bg-primary/40 hover:bg-primary/40",
		item.isReaded && !isSelected && "bg-primary/10 hover:bg-primary/10",
		item.isReaded && isSelected && "bg-primary/40 hover:bg-primary/40",
		"cursor-pointer border-0 hover:shadow-2xl transition-[background-color,box-shadow]"
	);
}

interface HomeProps {
	onItemClick: (id: number) => void;
	onItemDownload: (id: number) => void;
	onBulkDelete: (ids: number[]) => void;
}

interface DeleteItemDialog {
	id: number;
}

export function HomeUI({ onItemClick, onItemDownload }: HomeProps) {
	const [activeTab, setActiveTab] = React.useState<"myshare" | "friendshare">("myshare");
	const { items, loading, refreshData, setItems } = useShareData(activeTab);

	// Dialog
	const [deleteItemDialog, setDeleteItemDialog] = React.useState<DeleteItemDialog | null>(null);
	const [deleteBulkDialog, setDeleteBulkDialog] = React.useState<DeleteItemDialog[] | []>([]);

	// Search and filter state
	const [query, setQuery] = React.useState("");
	const [statusFilter, setStatusFilter] = React.useState<Status | "all">("all");
	const deferredQuery = React.useDeferredValue(query);

	// Selection state
	const [selected, setSelected] = React.useState<Set<number>>(new Set());

	// Pagination state
	const [currentPage, setCurrentPage] = React.useState(1);
	const itemsPerPage = 10;

	// Filter and paginate data
	const filteredItems = React.useMemo(() => {
		let filtered = items;

		if (deferredQuery.trim()) {
			const searchTerm = deferredQuery.toLowerCase();
			filtered = filtered.filter(
				(item) =>
					item.name.toLowerCase().includes(searchTerm) ||
					(item.device && item.device.toLowerCase().includes(searchTerm)) ||
					(item.friendName && item.friendName.toLowerCase().includes(searchTerm))
			);
		}

		if (statusFilter !== "all") {
			filtered = filtered.filter((item) => item.status === statusFilter);
		}

		return filtered;
	}, [items, deferredQuery, statusFilter]);

	const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
	const paginatedItems = React.useMemo(() => {
		const startIndex = (currentPage - 1) * itemsPerPage;
		return filteredItems.slice(startIndex, startIndex + itemsPerPage);
	}, [filteredItems, currentPage]);

	// Reset pagination when filters change
	React.useEffect(() => {
		setCurrentPage(1);
	}, [deferredQuery, statusFilter]);

	// Clear selection when tab changes
	React.useEffect(() => {
		setSelected(new Set());
	}, [activeTab]);

	// TanStack state for myshare
	const [myShareSorting, setMyShareSorting] = React.useState<SortingState>([]);
	const [myShareRowSelection, setMyShareRowSelection] = React.useState<RowSelectionState>({});

	// TanStack state for friendshare
	const [friendSorting, setFriendSorting] = React.useState<SortingState>([]);
	const [friendRowSelection, setFriendRowSelection] = React.useState<RowSelectionState>({});

	// Data for tables (only load data for active tab to optimize)
	const mySharePageData = React.useMemo<ShareItem[]>(
		() => (activeTab === "myshare" ? paginatedItems : []),
		[activeTab, paginatedItems]
	);
	const friendPageData = React.useMemo<ShareItem[]>(
		() => (activeTab === "friendshare" ? paginatedItems : []),
		[activeTab, paginatedItems]
	);

	// Columns for myshare
	const myShareColumns = React.useMemo<ColumnDef<ShareItem>[]>(
		() => [
			{
				id: "select",
				header: ({ table }) => (
					<Checkbox
						checked={
							table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")
						}
						onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
						aria-label="Select all"
					/>
				),
				cell: ({ row }) => (
					<Checkbox
						className="border-primary"
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
				accessorKey: "device",
				header: "อุปกรณ์",
				cell: ({ row }) => row.original.device ?? "-",
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
							>
								<Download className="h-4 w-4" />
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
						>
							<Trash2 className="h-4 w-4" />
						</Button>
					</div>
				),
			},
		],
		[]
	);

	// Columns for friendshare
	const friendColumns = React.useMemo<ColumnDef<ShareItem>[]>(
		() => [
			{
				id: "select",
				header: ({ table }) => (
					<Checkbox
						checked={
							table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")
						}
						onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
						aria-label="Select all"
					/>
				),
				cell: ({ row }) => (
					<Checkbox
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
				accessorKey: "friendName",
				header: "จาก",
				cell: ({ row }) => row.original.friendName ?? "-",
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
								className="h-8 w-8 hover:bg-primary/80 hover:text-primary-foreground"
								onClick={(e) => {
									e.stopPropagation();
									onItemDownload(row.original.id);
								}}
							>
								<Download className="h-4 w-4" />
							</Button>
						)}
						<Button
							variant="ghost"
							size="icon"
							className="h-8 w-8 hover:bg-destructive hover:text-primary-foreground"
							onClick={(e) => {
								e.stopPropagation();
								setDeleteItemDialog({ id: row.original.id });
							}}
						>
							<Trash2 className="h-4 w-4" />
						</Button>
					</div>
				),
			},
		],
		[]
	);

	// MyShare table instance
	const myShareTable = useReactTable({
		data: mySharePageData,
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
	});

	// Friend table instance
	const friendTable = useReactTable({
		data: friendPageData,
		columns: friendColumns,
		state: {
			sorting: friendSorting,
			rowSelection: friendRowSelection,
		},
		onSortingChange: setFriendSorting,
		onRowSelectionChange: setFriendRowSelection,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		enableRowSelection: true,
	});

	// Sync selected for myshare
	React.useEffect(() => {
		if (activeTab !== "myshare") return;
		const ids = new Set<number>();
		myShareTable.getSelectedRowModel().rows.forEach((r) => ids.add(r.original.id));
		setSelected(ids);
	}, [myShareRowSelection, activeTab, myShareTable]);

	// Sync selected for friendshare
	React.useEffect(() => {
		if (activeTab !== "friendshare") return;
		const ids = new Set<number>();
		friendTable.getSelectedRowModel().rows.forEach((r) => ids.add(r.original.id));
		setSelected(ids);
	}, [friendRowSelection, activeTab, friendTable]);

	const handleClearFilters = React.useCallback(() => {
		setQuery("");
		setStatusFilter("all");
	}, []);

	const handleBulkDelete = React.useCallback(() => {
		if (window.confirm(`คุณต้องการลบ ${selected.size} รายการที่เลือกหรือไม่?`)) {
			setItems((prev) => prev.filter((item) => !selected.has(item.id)));
			setSelected(new Set());
		}
	}, [selected, setItems]);

	const handleBulkDownload = React.useCallback(() => {
		console.log("Downloading items:", Array.from(selected));
		setSelected(new Set());
	}, [selected]);

	const filterBar = (
		<div className="flex items-center">
			<div className="flex items-center gap-4">
				<Input
					placeholder="ค้นหา..."
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					className="w-64"
				/>
				<Select value={statusFilter} onValueChange={(value: Status | "all") => setStatusFilter(value)}>
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
				<div className="flex items-center gap-2">
					<span>{selected.size} รายการที่เลือก</span>
					<Button variant="destructive" size="sm" onClick={handleBulkDelete}>
						<Trash2 className="w-4 h-4 mr-2" /> ลบ
					</Button>
					<Button variant="outline" size="sm" onClick={handleBulkDownload}>
						<Download className="w-4 h-4 mr-2" /> ดาวน์โหลด
					</Button>
				</div>
			)}
		</div>
	);

	return (
		<div className="h-full">
			<Tabs
				className="h-full"
				value={activeTab}
				onValueChange={(value) => setActiveTab(value as "myshare" | "friendshare")}
			>
				<Card className="h-full gap-0">
					<CardHeader>
						<CardTitle>รายการแชร์ของฉัน</CardTitle>
						<div className="flex items-center justify-between">
							<TabsList>
								<TabsTrigger value="all">ทั้งหมด</TabsTrigger>
								<TabsTrigger value="myshare">ของฉัน</TabsTrigger>
								<TabsTrigger value="friendshare">ของเพื่อน</TabsTrigger>
							</TabsList>
							<div className="flex gap-2">
								<Button variant="outline" onClick={refreshData}>
									<RefreshCcw className="w-4 h-4" />
								</Button>
								{filterBar}
							</div>
						</div>
					</CardHeader>
					<CardContent className="flex-1 flex flex-col mb-2">
						<TabsContent value="myshare" className="h-full rounded-lg border overflow-clip">
							<Table>
								<TableHeader>
									{myShareTable.getHeaderGroups().map((headerGroup) => (
										<TableRow key={headerGroup.id} className="bg-primary/80 hover:bg-primary/80">
											{headerGroup.headers.map((header) => (
												<TableHead key={header.id} style={{ width: `${header.getSize()}px` }}>
													{header.isPlaceholder
														? null
														: flexRender(
																header.column.columnDef.header,
																header.getContext()
															)}
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
													<Loader2 className="w-4 h-4 animate-spin" /> กำลังโหลด
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
											<TableRow
												key={row.id}
												className={getRowClassName(row.original, row.getIsSelected())}
												onClick={() => onItemClick(row.original.id)}
											>
												{row.getVisibleCells().map((cell) => (
													<TableCell key={cell.id}>
														{flexRender(cell.column.columnDef.cell, cell.getContext())}
													</TableCell>
												))}
											</TableRow>
										))
									)}
									<TableRow className="h-2">
										{/* <TableCell colSpan={myShareTable.getRowModel()} /> */}
									</TableRow>
								</TableBody>
							</Table>
						</TabsContent>
						<TabsContent value="friendshare" className="h-full rounded-lg border overflow-clip">
							<Table>
								<TableHeader>
									{friendTable.getHeaderGroups().map((headerGroup) => (
										<TableRow key={headerGroup.id} className="bg-primary/80 hover:bg-primary/80">
											{headerGroup.headers.map((header) => (
												<TableHead
													key={header.id}
													className="text-primary-foreground"
													style={{ width: `${header.getSize()}px` }}
												>
													{header.isPlaceholder
														? null
														: flexRender(
																header.column.columnDef.header,
																header.getContext()
															)}
												</TableHead>
											))}
										</TableRow>
									))}
								</TableHeader>
								<TableBody>
									{loading ? (
										<TableRow>
											<TableCell colSpan={friendColumns.length}>
												<div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
													<Loader2 className="w-4 h-4 animate-spin" /> กำลังโหลด
												</div>
											</TableCell>
										</TableRow>
									) : friendTable.getRowModel().rows.length === 0 ? (
										<TableRow>
											<TableCell colSpan={friendColumns.length} className="text-center py-8">
												ไม่มีรายการ
											</TableCell>
										</TableRow>
									) : (
										friendTable.getRowModel().rows.map((row) => (
											<TableRow
												key={row.id}
												className={getRowClassName(row.original, row.getIsSelected())}
												onClick={() => row.toggleSelected()}
											>
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
						</TabsContent>
					</CardContent>
					<CardFooter className="flex items-center justify-between text-sm text-muted-foreground">
						<div>
							แสดง {paginatedItems.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} -{" "}
							{(currentPage - 1) * itemsPerPage + paginatedItems.length} จาก {filteredItems.length}
						</div>
						<div className="flex items-center gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
								disabled={currentPage === 1}
							>
								<ChevronLeft className="w-4 h-4" />
							</Button>
							<span>
								หน้า {currentPage} / {totalPages}
							</span>
							<Button
								variant="outline"
								size="sm"
								onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
								disabled={currentPage === totalPages}
							>
								<ChevronRight className="w-4 h-4" />
							</Button>
						</div>
					</CardFooter>
				</Card>
			</Tabs>

			{/* Delete Dialog Here (with shadcn/ui alert dialog) */}
		</div>
	);
}

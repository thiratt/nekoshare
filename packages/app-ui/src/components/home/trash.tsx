import * as React from "react";
import {
	AlertCircle,
	CheckCircle,
	ChevronLeft,
	ChevronRight,
	Clock,
	Loader2,
	RefreshCcw,
	RotateCw,
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
import { CardTitle, CardContent, CardHeader, Card, CardFooter, CardDescription } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Input } from "@workspace/ui/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { cn } from "@workspace/ui/lib/utils";
import { Badge } from "@workspace/ui/components/badge";

// ---------- Types ----------
interface ShareItem {
	id: number;
	name: string;
	device?: string;
	friendName?: string;
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
		"cursor-pointer border-0 hover:shadow-2xl"
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

export function TrashUI({ onItemClick, onItemDownload }: HomeProps) {
	const { items, loading, refreshData, setItems } = useShareData("myshare");

	// Dialog
	const [deleteItemDialog, setDeleteItemDialog] = React.useState<DeleteItemDialog | null>(null);
	const [deleteBulkDialog, setDeleteBulkDialog] = React.useState<DeleteItemDialog[] | []>([]);

	// Search and filter state
	const [query, setQuery] = React.useState("");
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

		return filtered;
	}, [items, deferredQuery]);

	const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
	const paginatedItems = React.useMemo(() => {
		const startIndex = (currentPage - 1) * itemsPerPage;
		return filteredItems.slice(startIndex, startIndex + itemsPerPage);
	}, [filteredItems, currentPage]);

	// Reset pagination when filters change
	React.useEffect(() => {
		setCurrentPage(1);
	}, [deferredQuery]);

	// TanStack state for myshare
	const [myShareSorting, setMyShareSorting] = React.useState<SortingState>([]);
	const [myShareRowSelection, setMyShareRowSelection] = React.useState<RowSelectionState>({});

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
						<Button
							variant="ghost"
							size="icon"
							className="h-8 w-8 hover:bg-primary/80 hover:text-primary-foreground"
							onClick={(e) => {
								e.stopPropagation();
								onItemDownload(row.original.id);
							}}
						>
							<RotateCw />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							className="h-8 w-8 hover:bg-destructive hover:text-primary-foreground"
							onClick={(e) => {
								e.stopPropagation();
								setDeleteItemDialog({ id: row.original.id });
							}}
						>
							<Trash2 />
						</Button>
					</div>
				),
			},
		],
		[]
	);

	// MyShare table instance
	const myShareTable = useReactTable({
		data: items,
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

	const handleClearFilters = React.useCallback(() => {
		setQuery("");
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
		<div className="flex items-center justify-between mb-4">
			<div className="flex items-center gap-4">
				<Input
					placeholder="ค้นหา..."
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					className="w-64"
				/>
				<Button variant="outline" onClick={handleClearFilters}>
					ล้างตัวกรอง
				</Button>
			</div>
			<div className="flex gap-2">
				{selected.size > 0 && (
					<div className="flex items-center gap-2">
						<span>{selected.size} รายการที่เลือก</span>
						<Button variant="ghost" size="sm" onClick={handleBulkDelete}>
							<RotateCw /> กู้คืน
						</Button>
						<Button variant="destructive" size="sm" onClick={handleBulkDownload}>
							<Trash2 /> ลบ
						</Button>
					</div>
				)}
				<Button variant="outline" onClick={refreshData}>
					<RefreshCcw className="w-4 h-4 mr-2" />
					รีเฟรช
				</Button>
			</div>
		</div>
	);

	return (
		<div className="h-full">
			<Card className="h-full">
				<CardHeader className="flex flex-row justify-between">
					<div className="space-y-2">
						<div className="space-y-1">
							<CardTitle>ถังขยะ</CardTitle>
							<CardDescription>ถังขยะจะลบรายการทั้งหมดอย่างถาวรภายใน 30 วัน</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent className="flex-1 flex flex-col">
					{filterBar}
					<div className="h-full rounded-lg border overflow-clip">
						<Table>
							<TableHeader>
								{myShareTable.getHeaderGroups().map((headerGroup) => (
									<TableRow key={headerGroup.id} className="bg-primary/80 hover:bg-primary/80">
										{headerGroup.headers.map((header) => (
											<TableHead
												className="text-primary-foreground"
												key={header.id}
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
							</TableBody>
						</Table>
					</div>
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

			{/* Delete Dialog Here (with shadcn/ui alert dialog) */}
		</div>
	);
}

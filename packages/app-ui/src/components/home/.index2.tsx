import * as React from "react";
import { ChevronLeft, ChevronRight, Loader2, MoreHorizontal, RefreshCcw, Trash2 } from "lucide-react";
import { CardTitle, CardContent, CardHeader, Card, CardFooter } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { cn } from "@workspace/ui/lib/utils";
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuItem,
	DropdownMenuSeparator,
} from "@workspace/ui/components/dropdown-menu";

// ---------- Types ----------
type Status = "success" | "failed" | "processing";

interface FriendShareProps {
	id: number;
	name: string;
	device: string;
	status: Status;
	uploadedAt: string; // ISO
	isReaded: boolean;

}
interface MyShareProps {
	id: number;
	name: string;
	device: string;
	status: Status;
	uploadedAt: string; // ISO
	isReaded: boolean;
}

// ---------- Fake data layer (swap with your real API) ----------
function useMyshare() {
	const [items, setItems] = React.useState<MyShareProps[]>([]);
	const [loading, setLoading] = React.useState(false);

	React.useEffect(() => {
		setLoading(true);
		const t = setTimeout(() => {
			const now = new Date();
			setItems([
				{
					id: 1,
					name: "Alex Johnson",
					device: "Acer Nitro V15",
					status: "success",
					uploadedAt: new Date(now.getTime() - 86400e3 * 12).toISOString(),
					isReaded: false,
				},
			]);
			setLoading(false);
		}, 350);
		return () => clearTimeout(t);
	}, []);

	return { items, loading };
}

// ---------- Utilities ----------
function formatDate(s: string) {
	try {
		return new Date(s).toLocaleString();
	} catch {
		return s;
	}
}

export function HomeUI() {
	const { items, loading } = useMyshare();

	// search, sort, paginate
	const [query, setQuery] = React.useState("");
	const dq = React.useDeferredValue(query);

	type SortKey = "uploadedAt";
	const [sort, setSort] = React.useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "uploadedAt", dir: "desc" });

	const [page, setPage] = React.useState(1);
	const pageSize = 8;

	const [selected, setSelected] = React.useState<Set<number>>(new Set());
	const allSelected = selected.size > 0 && selected.size === items.length;

	// computed
	const filtered = React.useMemo(() => {
		const q = dq.trim().toLowerCase();
		if (!q) return items;
		return items.filter((b) => (b.name + " " + b.device).toLowerCase().includes(q));
	}, [items, dq]);

	const sorted = React.useMemo(() => {
		const arr = [...filtered];
		// arr.sort((a, b) => {
		// 	// const dir = sort.dir === "asc" ? 1 : -1;
		// 	switch (sort.key) {
		// 		// case "name":
		// 		// 	return a.name.localeCompare(b.name) * dir;
		// 		// case "status":
		// 		// 	return a.status.localeCompare(b.status) * dir;
		// 		// case "sharedCount":
		// 		// 	return (a.sharedCount - b.sharedCount) * dir;
		// 		// case "lastActive":
		// 		// 	return (new Date(a.lastActive).getTime() - new Date(b.lastActive).getTime()) * dir;
		// 		default:
		// 			return 0;
		// 	}
		// });
		return arr;
	}, [filtered, sort]);

	const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
	React.useEffect(() => {
		// clamp if shrinking dataset
		setPage((p) => Math.min(p, pageCount));
	}, [pageCount]);

	const paged = React.useMemo(() => {
		const start = (page - 1) * pageSize;
		return sorted.slice(start, start + pageSize);
	}, [sorted, page]);

	// handlers
	const toggleAll = React.useCallback(
		(checked: boolean) => {
			setSelected(checked ? new Set(items.map((b) => b.id)) : new Set());
		},
		[items]
	);

	const toggleOne = React.useCallback((id: number) => {
		setSelected((prev) => {
			const n = new Set(prev);
			n.has(id) ? n.delete(id) : n.add(id);
			return n;
		});
	}, []);

	return (
		<Tabs defaultValue="myshare" className="h-full">
			<Card className="h-full">
				<CardHeader className="flex justify-between">
					<div className="space-y-2">
						<div className="space-y-1">
							<CardTitle>รายการแชร์ของฉัน</CardTitle>
						</div>
						<TabsList>
							<TabsTrigger value="myshare">ของฉัน</TabsTrigger>
							<TabsTrigger value="friendshare">ของเพื่อน</TabsTrigger>
						</TabsList>
					</div>
					<div>
						<Button>
							<RefreshCcw />
						</Button>
					</div>
				</CardHeader>
				<CardContent className="h-full">
					<TabsContent className="h-full rounded-md border" value="myshare">
						<Table>
							<TableHeader className="bg-muted">
								<TableRow>
									<TableHead className="w-10">
										<Checkbox
											checked={allSelected}
											onCheckedChange={(v) => toggleAll(Boolean(v))}
											aria-label="Select all"
										/>
									</TableHead>
									<TableHead>รายการ</TableHead>
									<TableHead>อุปกรณ์</TableHead>
									<TableHead>สถานะ</TableHead>
									<TableHead>วันที่</TableHead>
									<TableHead className="w-16 text-right">ตัวเลือก</TableHead>
								</TableRow>
							</TableHeader>

							<TableBody>
								{loading ? (
									<TableRow>
										<TableCell colSpan={7}>
											<div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
												<Loader2 className="w-4 h-4 animate-spin" /> Loading
											</div>
										</TableCell>
									</TableRow>
								) : paged.length === 0 ? (
									<TableRow>
										<TableCell colSpan={7}>None</TableCell>
									</TableRow>
								) : (
									paged.map((b) => {
										const isSel = selected.has(b.id);
										return (
											<TableRow key={b.id} className={cn(isSel && "bg-muted/50")}>
												<TableCell className="w-10 align-middle">
													<Checkbox
														checked={isSel}
														onCheckedChange={() => toggleOne(b.id)}
														aria-label={`Select ${b.name}`}
													/>
												</TableCell>
												<TableCell>{b.name}</TableCell>
												<TableCell>{b.device}</TableCell>
												<TableCell>{b.status}</TableCell>
												<TableCell>
													<span className="text-sm text-muted-foreground">
														{formatDate(b.uploadedAt)}
													</span>
												</TableCell>
												<TableCell className="w-16 text-right">
													<RowActions />
												</TableCell>
											</TableRow>
										);
									})
								)}
							</TableBody>
						</Table>
					</TabsContent>
				</CardContent>
				<CardFooter className="flex items-center justify-between text-sm text-muted-foreground">
					<div>
						Showing {paged.length === 0 ? 0 : (page - 1) * pageSize + 1} -{" "}
						{(page - 1) * pageSize + paged.length} of {sorted.length}
					</div>
					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => setPage((p) => Math.max(1, p - 1))}
							disabled={page === 1}
						>
							<ChevronLeft className="w-4 h-4" />
						</Button>
						<span>
							Page {page} / {pageCount}
						</span>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
							disabled={page === pageCount}
						>
							<ChevronRight className="w-4 h-4" />
						</Button>
					</div>
				</CardFooter>
			</Card>
		</Tabs>
	);
}

// ---------- Small components ----------

function RowActions() {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="icon" className="h-8 w-8">
					<MoreHorizontal className="h-4 w-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-40">
				<DropdownMenuLabel>Actions</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem className="gap-2 text-destructive focus:text-destructive">
					<Trash2 className="w-4 h-4" /> Delete
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

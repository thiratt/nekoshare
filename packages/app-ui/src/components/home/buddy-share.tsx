// BuddyShareUI.tsx
import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Badge } from "@workspace/ui/components/badge";
import { Checkbox } from "@workspace/ui/components/checkbox";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
	DialogTrigger,
} from "@workspace/ui/components/dialog";
import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogCancel,
	AlertDialogAction,
} from "@workspace/ui/components/alert-dialog";
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuLabel,
} from "@workspace/ui/components/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { cn } from "@workspace/ui/lib/utils";
import {
	Search,
	MoreHorizontal,
	UserPlus2,
	Trash2,
	Shield,
	ShieldCheck,
	Link as LinkIcon,
	ChevronLeft,
	ChevronRight,
	ChevronDown,
	Loader2,
} from "lucide-react";
import { CardTransition } from "../transition-view";

// ---------- Types ----------
type Status = "active" | "pending";

interface Buddy {
	id: number;
	name: string;
	email: string;
	avatarUrl?: string;
	status: Status;
	sharedCount: number;
	lastActive: string; // ISO
	invitedAt: string; // ISO
}

// ---------- Fake data layer (swap with your real API) ----------
function useBuddies() {
	const [items, setItems] = React.useState<Buddy[]>([]);
	const [loading, setLoading] = React.useState(false);

	React.useEffect(() => {
		setLoading(true);
		const t = setTimeout(() => {
			const now = new Date();
			setItems([
				{
					id: 1,
					name: "Alex Johnson",
					email: "alex@example.com",
					status: "active",
					sharedCount: 42,
					lastActive: new Date(now.getTime() - 3600e3).toISOString(),
					invitedAt: new Date(now.getTime() - 86400e3 * 12).toISOString(),
					avatarUrl: "",
				},
				{
					id: 2,
					name: "Mina Park",
					email: "mina@example.com",
					status: "pending",
					sharedCount: 7,
					lastActive: new Date(now.getTime() - 86400e3 * 4).toISOString(),
					invitedAt: new Date(now.getTime() - 86400e3 * 2).toISOString(),
					avatarUrl: "",
				},
				{
					id: 3,
					name: "Samir Rao",
					email: "samir@example.com",
					status: "active",
					sharedCount: 15,
					lastActive: new Date(now.getTime() - 86400e3).toISOString(),
					invitedAt: new Date(now.getTime() - 86400e3 * 40).toISOString(),
					avatarUrl: "",
				},
			]);
			setLoading(false);
		}, 350);
		return () => clearTimeout(t);
	}, []);

	const invite = React.useCallback(async (payload: { email: string; message?: string }) => {
		const buddy: Buddy = {
			id: Math.floor(Math.random() * 100_000),
			name: payload.email.split("@")[0] ?? "",
			email: payload.email,
			status: "pending",
			sharedCount: 0,
			lastActive: new Date().toISOString(),
			invitedAt: new Date().toISOString(),
		};
		setItems((xs) => [buddy, ...xs]);
		return buddy;
	}, []);

	const revoke = React.useCallback(async (ids: number[]) => {
		setItems((xs) => xs.filter((b) => !ids.includes(b.id)));
	}, []);

	return { items, loading, invite, revoke, setItems };
}

// ---------- Utilities ----------
function formatDate(s: string) {
	try {
		return new Date(s).toLocaleString();
	} catch {
		return s;
	}
}
function initials(name: string) {
	const parts = name.trim().split(" ").filter(Boolean);
	return (parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "");
}

// ---------- BuddyShareUI ----------
export function BuddyShareUI(): React.JSX.Element {
	const { items, loading, invite, revoke } = useBuddies();

	// search, sort, paginate
	const [query, setQuery] = React.useState("");
	const dq = React.useDeferredValue(query);

	type SortKey = "name" | "status" | "sharedCount" | "lastActive";
	const [sort, setSort] = React.useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "lastActive", dir: "desc" });

	const [page, setPage] = React.useState(1);
	const pageSize = 8;

	const [selected, setSelected] = React.useState<Set<number>>(new Set());
	const allSelected = selected.size > 0 && selected.size === items.length;

	// dialogs
	const [addOpen, setAddOpen] = React.useState(false);
	const [confirmOpen, setConfirmOpen] = React.useState(false);
	const [confirmIds, setConfirmIds] = React.useState<number[]>([]);

	// computed
	const filtered = React.useMemo(() => {
		const q = dq.trim().toLowerCase();
		if (!q) return items;
		return items.filter((b) => (b.name + " " + b.email).toLowerCase().includes(q));
	}, [items, dq]);

	const sorted = React.useMemo(() => {
		const arr = [...filtered];
		arr.sort((a, b) => {
			const dir = sort.dir === "asc" ? 1 : -1;
			switch (sort.key) {
				case "name":
					return a.name.localeCompare(b.name) * dir;
				case "status":
					return a.status.localeCompare(b.status) * dir;
				case "sharedCount":
					return (a.sharedCount - b.sharedCount) * dir;
				case "lastActive":
					return (new Date(a.lastActive).getTime() - new Date(b.lastActive).getTime()) * dir;
				default:
					return 0;
			}
		});
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

	const askRevoke = React.useCallback((ids: number[]) => {
		setConfirmIds(ids);
		setConfirmOpen(true);
	}, []);

	const doRevoke = React.useCallback(async () => {
		const ids = confirmIds;
		setConfirmOpen(false);
		setSelected((s) => {
			const n = new Set(s);
			ids.forEach((id) => n.delete(id));
			return n;
		});
		// optimistic remove
		await revoke(ids);
	}, [confirmIds, revoke]);

	const onSort = (key: SortKey) => {
		setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
	};

	return (
		<CardTransition className="h-full" tag="buddy-share-card">
			<CardHeader className="flex items-start sm:items-center justify-between gap-4">
				<div className="space-y-1">
					<CardTitle>Buddy share</CardTitle>
					<CardDescription>คนที่สามารถเห็นข้อมูลของคุณได้</CardDescription>
				</div>

				<div className="flex flex-col sm:flex-row gap-2 sm:items-center">
					{/* Bulk bar */}
					{selected.size > 0 && (
						<div className="flex items-center justify-between gap-2">
							<span className="text-sm">{selected.size} selected</span>
							<div className="flex items-center gap-2">
								<Button
									variant="destructive"
									size="sm"
									className="gap-2"
									onClick={() => askRevoke(Array.from(selected))}
								>
									<Trash2 className="w-4 h-4" /> Revoke access
								</Button>
								<Button variant="outline" size="sm" onClick={() => setSelected(new Set())}>
									Clear
								</Button>
							</div>
						</div>
					)}

					<div className="relative">
						<Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						<Input
							value={query}
							onChange={(e) => {
								setQuery(e.target.value);
								setPage(1);
							}}
							placeholder="ค้นหาด้วยชื่อหรืออีเมล"
							className="pl-8 w-[240px]"
						/>
					</div>

					<Dialog open={addOpen} onOpenChange={setAddOpen}>
						<DialogTrigger asChild>
							<Button className="gap-2">
								<UserPlus2 className="w-4 h-4" /> เพิ่มเพื่อน
							</Button>
						</DialogTrigger>
						<AddBuddyDialog
							onSubmit={async (data) => {
								await invite(data);
								setAddOpen(false);
							}}
						/>
					</Dialog>
				</div>
			</CardHeader>

			<CardContent className="flex flex-col h-full">
				<div className="flex-1 rounded-lg border overflow-clip">
					<Table>
						<TableHeader>
							<TableRow className="bg-primary/80 hover:bg-primary/80">
								<TableHead className="w-10">
									<Checkbox
										checked={allSelected}
										onCheckedChange={(v) => toggleAll(Boolean(v))}
										aria-label="Select all"
									/>
								</TableHead>
								<SortableHead
									onClick={() => onSort("name")}
									active={sort.key === "name"}
									dir={sort.dir}
								>
									เพื่อน
								</SortableHead>
								<SortableHead
									onClick={() => onSort("status")}
									active={sort.key === "status"}
									dir={sort.dir}
									className="w-28"
								>
									สถานะ
								</SortableHead>
								<SortableHead
									onClick={() => onSort("sharedCount")}
									active={sort.key === "sharedCount"}
									dir={sort.dir}
									className="w-24 text-right"
								>
									จำนวนการแชร์
								</SortableHead>
								<SortableHead
									onClick={() => onSort("lastActive")}
									active={sort.key === "lastActive"}
									dir={sort.dir}
									className="w-48"
								>
									ล่าสุด
								</SortableHead>
								<TableHead className="w-16 text-right">ตัวเลือก</TableHead>
							</TableRow>
						</TableHeader>

						<TableBody>
							{loading ? (
								<TableRow>
									<TableCell colSpan={7}>
										<div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
											<Loader2 className="w-4 h-4 animate-spin" /> Loading buddies…
										</div>
									</TableCell>
								</TableRow>
							) : paged.length === 0 ? (
								<TableRow>
									<TableCell colSpan={7}>
										<EmptyState query={dq} />
									</TableCell>
								</TableRow>
							) : (
								paged.map((b) => {
									const isSel = selected.has(b.id);
									return (
										<TableRow key={b.id} className={cn(isSel && "bg-muted/30")}>
											<TableCell className="w-10 align-middle">
												<Checkbox
													checked={isSel}
													onCheckedChange={() => toggleOne(b.id)}
													aria-label={`Select ${b.name}`}
												/>
											</TableCell>
											<TableCell className="min-w-[220px]">
												<div className="flex items-center gap-3">
													<Avatar className="h-8 w-8">
														<AvatarImage src={b.avatarUrl || undefined} alt={b.name} />
														<AvatarFallback>{initials(b.name)}</AvatarFallback>
													</Avatar>
													<div className="min-w-0">
														<div className="font-medium truncate">{b.name}</div>
														<div className="text-xs text-muted-foreground truncate">
															{b.email}
														</div>
													</div>
												</div>
											</TableCell>
											<TableCell className="w-28">
												<StatusBadge status={b.status} />
											</TableCell>
											<TableCell className="w-24 text-right">
												<span className="tabular-nums">{b.sharedCount}</span>
											</TableCell>
											<TableCell className="w-48">
												<span className="text-sm text-muted-foreground">
													{formatDate(b.lastActive)}
												</span>
											</TableCell>
											<TableCell className="w-16 text-right">
												<RowActions
													buddy={b}
													onCopy={() => navigator.clipboard.writeText(`app://share/${b.id}`)}
													onRevoke={() => askRevoke([b.id])}
												/>
											</TableCell>
										</TableRow>
									);
								})
							)}
						</TableBody>
					</Table>
				</div>

				{/* pagination */}
				<div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
					<div>
						Showing {paged.length === 0 ? 0 : (page - 1) * pageSize + 1}–
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
				</div>
			</CardContent>

			{/* Revoke confirm */}
			<AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							Revoke access for {confirmIds.length} {confirmIds.length === 1 ? "buddy" : "buddies"}?
						</AlertDialogTitle>
						<AlertDialogDescription>
							This removes their access to your shared content. You can re-invite later.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={doRevoke}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Revoke
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</CardTransition>
	);
}

// ---------- Small components ----------
function StatusBadge({ status }: { status: Status }) {
	return status === "active" ? (
		<Badge className="capitalize">active</Badge>
	) : (
		<Badge variant="outline" className="capitalize">
			pending
		</Badge>
	);
}
function SortableHead({
	children,
	className,
	onClick,
	active,
	dir,
}: {
	children: React.ReactNode;
	className?: string;
	onClick: () => void;
	active?: boolean;
	dir?: "asc" | "desc";
}) {
	return (
		<TableHead className={cn("cursor-pointer select-none", className)} onClick={onClick}>
			<div className="inline-flex items-center gap-1">
				{children}
				<ChevronDown
					className={cn(
						"w-4 h-4 transition-transform",
						active ? (dir === "asc" ? "rotate-180 opacity-100" : "opacity-100") : "opacity-40"
					)}
				/>
			</div>
		</TableHead>
	);
}
function EmptyState({ query }: { query: string }) {
	return (
		<div className="flex flex-col items-center justify-center py-12 text-center">
			<UserPlus2 className="w-8 h-8 mb-2 text-muted-foreground" />
			<p className="text-sm">{query ? <>No buddies match “{query}”.</> : <>No buddies yet.</>}</p>
			<p className="text-xs text-muted-foreground">Invite someone to share your content securely.</p>
		</div>
	);
}

function RowActions({ buddy, onCopy, onRevoke }: { buddy: Buddy; onCopy: () => void; onRevoke: () => void }) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="icon" className="h-8 w-8">
					<MoreHorizontal className="h-4 w-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-40">
				<DropdownMenuLabel>Actions</DropdownMenuLabel>
				<DropdownMenuItem onClick={onCopy} className="gap-2">
					<LinkIcon className="w-4 h-4" /> Copy link
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem onClick={onRevoke} className="gap-2 text-destructive focus:text-destructive">
					<Trash2 className="w-4 h-4" /> Revoke
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

// ---------- Add buddy dialog ----------
function AddBuddyDialog({ onSubmit }: { onSubmit: (data: { email: string; message?: string }) => Promise<void> }) {
	const [email, setEmail] = React.useState("");
	const [message, setMessage] = React.useState("");
	const [busy, setBusy] = React.useState(false);

	const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
	const canSubmit = isEmail(email) && !busy;

	const submit = async () => {
		if (!canSubmit) return;
		setBusy(true);
		try {
			await onSubmit({ email: email.trim(), message: message.trim() || undefined });
			setEmail("");
			setMessage("");
		} finally {
			setBusy(false);
		}
	};

	return (
		<DialogContent>
			<DialogHeader>
				<DialogTitle>เพิ่มเพื่อน</DialogTitle>
				<DialogDescription>
					เพื่อนจะได้รับคำเชิญผ่านอีเมล สามารถเพิ่มข้อความเพื่อบอกอะไรเขาได้นะ
				</DialogDescription>
			</DialogHeader>

			<div className="grid gap-4">
				<div className="grid gap-2">
					<Label htmlFor="invite-email">ชื่อผู้ใช้งานหรืออีเมลของเพื่อน</Label>
					<Input
						id="invite-email"
						type="email"
						placeholder="name@example.com"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
					/>
					{!isEmail(email) && email.length > 0 && (
						<span className="text-xs text-destructive">Enter a valid email.</span>
					)}
				</div>

				<div className="grid gap-2">
					<Label htmlFor="invite-msg">ข้อความ (ไม่จำเป็น)</Label>
					<Input
						id="invite-msg"
						placeholder="มาเป็นเพื่อนกันมั้ย"
						value={message}
						onChange={(e) => setMessage(e.target.value)}
					/>
				</div>
			</div>

			<DialogFooter className="gap-2">
				<Button variant="outline">ยกเลิก</Button>
				<Button onClick={submit} disabled={!canSubmit} className="gap-2">
					{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus2 className="w-4 h-4" />}
					ส่งคำเชิญ
				</Button>
			</DialogFooter>
		</DialogContent>
	);
}

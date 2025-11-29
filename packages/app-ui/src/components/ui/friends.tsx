import { useState, useEffect, useMemo, useCallback, useDeferredValue, memo } from "react";

import {
	LuArrowUpDown,
	LuCheck,
	LuChevronDown,
	LuChevronLeft,
	LuChevronRight,
	LuChevronUp,
	LuEllipsis,
	LuLink,
	LuLoader,
	LuRefreshCcw,
	LuTrash2,
	LuUserPlus,
} from "react-icons/lu";
import {
	type ColumnDef,
	type RowSelectionState,
	type SortingState,
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
	useReactTable,
} from "@tanstack/react-table";

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
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Checkbox } from "@workspace/ui/components/checkbox";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@workspace/ui/components/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { SearchInput } from "@workspace/ui/components/search-input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@workspace/ui/components/tooltip";

import { CardTransition } from "@workspace/app-ui/components/ext/transition-view";

type Status = "active" | "pending";

interface FriendProps {
	id: number;
	name: string;
	email: string;
	avatarUrl?: string;
	status: Status;
	sharedCount: number;
	lastActive: string;
	invitedAt: string;
}

const PAGE_SIZE = 8;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const STATUS_CONFIG: Record<Status, { label: string; variant: "default" | "outline" }> = {
	active: { label: "active", variant: "default" },
	pending: { label: "pending", variant: "outline" },
};

const formatDate = (dateString: string): string => {
	try {
		return new Date(dateString).toLocaleString();
	} catch {
		return dateString;
	}
};

const getInitials = (name: string): string => {
	const parts = name.trim().split(" ").filter(Boolean);
	return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
};

const isValidEmail = (value: string): boolean => EMAIL_REGEX.test(value);

function useFriends() {
	const [items, setItems] = useState<FriendProps[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const controller = new AbortController();

		const fetchFriends = async () => {
			setLoading(true);

			await new Promise((resolve) => setTimeout(resolve, 350));

			if (controller.signal.aborted) return;

			const now = Date.now();
			const data: FriendProps[] = [
				{
					id: 1,
					name: "Alex Johnson",
					email: "alex@example.com",
					status: "active",
					sharedCount: 42,
					lastActive: new Date(now - 3600e3).toISOString(),
					invitedAt: new Date(now - 86400e3 * 12).toISOString(),
				},
				{
					id: 2,
					name: "Mina Park",
					email: "mina@example.com",
					status: "pending",
					sharedCount: 7,
					lastActive: new Date(now - 86400e3 * 4).toISOString(),
					invitedAt: new Date(now - 86400e3 * 2).toISOString(),
				},
				{
					id: 3,
					name: "Samir Rao",
					email: "samir@example.com",
					status: "active",
					sharedCount: 15,
					lastActive: new Date(now - 86400e3).toISOString(),
					invitedAt: new Date(now - 86400e3 * 40).toISOString(),
				},
				{
					id: 4,
					name: "Lena Müller",
					email: "lena@example.com",
					status: "pending",
					sharedCount: 0,
					lastActive: new Date(now - 86400e3 * 10).toISOString(),
					invitedAt: new Date(now - 86400e3 * 1).toISOString(),
				},
			];
			setItems(data.sort((a, b) => a.name.localeCompare(b.name)));
			setLoading(false);
		};

		fetchFriends();
		return () => controller.abort();
	}, []);

	const invite = useCallback(async (payload: { email: string; message?: string }): Promise<FriendProps> => {
		const friendModelInvite: FriendProps = {
			id: Math.floor(Math.random() * 100_000),
			name: payload.email.split("@")[0] ?? "",
			email: payload.email,
			status: "pending",
			sharedCount: 0,
			lastActive: new Date().toISOString(),
			invitedAt: new Date().toISOString(),
		};
		setItems((prev) => [friendModelInvite, ...prev]);
		return friendModelInvite;
	}, []);

	const revoke = useCallback(async (ids: number[]): Promise<void> => {
		const idSet = new Set(ids);
		setItems((prev) => prev.filter((friend) => !idSet.has(friend.id)));
	}, []);

	return { items, loading, invite, revoke } as const;
}

export function FriendsUI() {
	const { items, loading, invite, revoke } = useFriends();

	const [query, setQuery] = useState("");
	const deferredQuery = useDeferredValue(query);
	const [currentPage, setCurrentPage] = useState(1);

	const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
	const [revokeConfirmation, setRevokeConfirmation] = useState<{ open: boolean; ids: number[] }>({
		open: false,
		ids: [],
	});

	const [sorting, setSorting] = useState<SortingState>([]);
	const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

	const filteredItems = useMemo(() => {
		const normalizedQuery = deferredQuery.trim().toLowerCase();
		if (!normalizedQuery) return items;
		return items.filter((friend) => `${friend.name} ${friend.email}`.toLowerCase().includes(normalizedQuery));
	}, [items, deferredQuery]);

	const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));

	const paginatedItems = useMemo(() => {
		const startIndex = (currentPage - 1) * PAGE_SIZE;
		return filteredItems.slice(startIndex, startIndex + PAGE_SIZE);
	}, [filteredItems, currentPage]);

	useEffect(() => {
		setCurrentPage(1);
	}, [deferredQuery]);

	const handleRevokeRequest = useCallback((ids: number[]) => {
		setRevokeConfirmation({ open: true, ids });
	}, []);

	const handleCopyLink = useCallback(async () => {
		await navigator.clipboard.writeText(`TODO: Replace with actual link`);
	}, []);

	const columns = useMemo<ColumnDef<FriendProps>[]>(
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
						aria-label="เลือกทั้งหมด"
					/>
				),
				cell: ({ row }) => (
					<Checkbox
						className="border-foreground"
						onClick={(e) => e.stopPropagation()}
						checked={row.getIsSelected()}
						onCheckedChange={(value) => row.toggleSelected(!!value)}
						aria-label={`เลือก ${row.original.name}`}
					/>
				),
				size: 40,
				enableSorting: false,
			},
			{
				accessorKey: "name",
				header: ({ column }) => {
					const sorted = column.getIsSorted();
					return (
						<div
							className="inline-flex items-center gap-1 cursor-pointer select-none"
							onClick={() => column.toggleSorting(sorted === "asc")}
						>
							เพื่อน
							{sorted === "asc" ? (
								<LuChevronUp className="w-4 h-4" />
							) : sorted === "desc" ? (
								<LuChevronDown className="w-4 h-4" />
							) : (
								<LuArrowUpDown className="w-4 h-4" />
							)}
						</div>
					);
				},
				size: 800,
				cell: ({ row }) => (
					<div className="flex items-center gap-3">
						<Avatar className="h-9 w-9 ring-2 ring-background">
							<AvatarImage src={row.original.avatarUrl || undefined} alt={row.original.name} />
							<AvatarFallback className="text-xs font-medium">
								{getInitials(row.original.name)}
							</AvatarFallback>
						</Avatar>
						<div className="min-w-0 flex-1">
							<div className="font-medium truncate">{row.original.name}</div>
							<div className="text-xs text-muted-foreground truncate">{row.original.email}</div>
						</div>
					</div>
				),
			},
			{
				accessorKey: "status",
				header: ({ column }) => {
					const sorted = column.getIsSorted();
					return (
						<div
							className="inline-flex items-center gap-1 cursor-pointer select-none"
							onClick={() => column.toggleSorting(sorted === "asc")}
						>
							สถานะ
							{sorted === "asc" ? (
								<LuChevronUp className="w-4 h-4" />
							) : sorted === "desc" ? (
								<LuChevronDown className="w-4 h-4" />
							) : (
								<LuArrowUpDown className="w-4 h-4" />
							)}
						</div>
					);
				},
				cell: ({ row }) => <StatusBadge status={row.original.status} />,
			},
			{
				accessorKey: "sharedCount",
				header: ({ column }) => {
					const sorted = column.getIsSorted();
					return (
						<div
							className="inline-flex items-center gap-1 cursor-pointer select-none"
							onClick={() => column.toggleSorting(sorted === "asc")}
						>
							จำนวนการแชร์
							{sorted === "asc" ? (
								<LuChevronUp className="w-4 h-4" />
							) : sorted === "desc" ? (
								<LuChevronDown className="w-4 h-4" />
							) : (
								<LuArrowUpDown className="w-4 h-4" />
							)}
						</div>
					);
				},
				cell: ({ row }) => <span className="tabular-nums font-medium">{row.original.sharedCount}</span>,
			},
			{
				accessorKey: "lastActive",
				header: ({ column }) => {
					const sorted = column.getIsSorted();
					return (
						<div
							className="inline-flex items-center gap-1 cursor-pointer select-none"
							onClick={() => column.toggleSorting(sorted === "asc")}
						>
							ล่าสุดที่ใช้งาน
							{sorted === "asc" ? (
								<LuChevronUp className="w-4 h-4" />
							) : sorted === "desc" ? (
								<LuChevronDown className="w-4 h-4" />
							) : (
								<LuArrowUpDown className="w-4 h-4" />
							)}
						</div>
					);
				},
				cell: ({ row }) => (
					<Tooltip>
						<TooltipTrigger asChild>
							<span className="text-sm text-muted-foreground cursor-default">
								{formatDate(row.original.lastActive)}
							</span>
						</TooltipTrigger>
						<TooltipContent>เชิญเมื่อ: {formatDate(row.original.invitedAt)}</TooltipContent>
					</Tooltip>
				),
			},
			{
				id: "actions",
				header: "ตัวเลือก",
				enableSorting: false,
				cell: ({ row }) => (
					<RowActions onCopy={handleCopyLink} onRevoke={() => handleRevokeRequest([row.original.id])} />
				),
			},
		],
		[handleCopyLink, handleRevokeRequest]
	);

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

	const selected = useMemo(() => {
		const ids = new Set<number>();
		table.getSelectedRowModel().rows.forEach((r) => ids.add(r.original.id));
		return ids;
	}, [rowSelection, table]);

	const handleRevokeConfirm = useCallback(async () => {
		const { ids } = revokeConfirmation;
		setRevokeConfirmation({ open: false, ids: [] });
		setRowSelection({});
		await revoke(ids);
	}, [revokeConfirmation, revoke]);

	const handleInvite = useCallback(
		async (data: { email: string; message?: string }) => {
			await invite(data);
			setIsAddDialogOpen(false);
		},
		[invite]
	);

	return (
		<CardTransition className="h-full" tag="friend-share-card">
			<CardHeader>
				<div className="space-y-1">
					<CardTitle>เพื่อน</CardTitle>
					<CardDescription>คนที่สามารถแชร์ข้อมูลกับคุณได้</CardDescription>
				</div>
				<div className="flex">
					<div className="flex items-center gap-2">
						<Button variant="outline">
							<LuRefreshCcw />
						</Button>
						<SearchInput
							placeholder="ค้นหา..."
							searchQuery={query}
							onSearchQuery={setQuery}
							onClearSearch={() => setQuery("")}
							className="w-64"
						/>
					</div>
					<div className="flex items-center ms-auto">
						{selected.size > 0 && (
							<div className="flex items-center gap-2 mr-2">
								<span>{selected.size} รายการที่เลือก</span>
								<Button variant="destructive" onClick={() => handleRevokeRequest(Array.from(selected))}>
									<LuTrash2 />
								</Button>
							</div>
						)}
						<Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
							<DialogTrigger asChild>
								<Button className="gap-2">
									<LuUserPlus className="w-4 h-4" />
									เพิ่มเพื่อน
								</Button>
							</DialogTrigger>
							<AddFriendDialog onSubmit={handleInvite} />
						</Dialog>
					</div>
				</div>
			</CardHeader>

			<CardContent className="flex flex-col h-full">
				<div className="flex-1 rounded-lg border overflow-clip dark:border-secondary">
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
										{deferredQuery ? `ไม่พบเพื่อนที่ตรงกับ "${deferredQuery}"` : "ยังไม่มีเพื่อน"}
									</TableCell>
								</TableRow>
							) : (
								table.getRowModel().rows.map((row) => (
									<TableRow key={row.id}>
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

				<div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
					<div>
						แสดง {paginatedItems.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1} -{" "}
						{(currentPage - 1) * PAGE_SIZE + paginatedItems.length} จาก {filteredItems.length}
					</div>
					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
							disabled={currentPage === 1}
							aria-label="หน้าก่อน"
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
							aria-label="หน้าถัดไป"
						>
							<LuChevronRight className="w-4 h-4" />
						</Button>
					</div>
				</div>
			</CardContent>

			<RevokeConfirmDialog
				open={revokeConfirmation.open}
				count={revokeConfirmation.ids.length}
				onConfirm={handleRevokeConfirm}
				onCancel={() => setRevokeConfirmation({ open: false, ids: [] })}
			/>
		</CardTransition>
	);
}

const StatusBadge = memo(function StatusBadge({ status }: { status: Status }) {
	const config = STATUS_CONFIG[status];
	return (
		<Badge variant={config.variant} className="capitalize">
			{config.label}
		</Badge>
	);
});

interface RowActionsProps {
	onCopy: () => void;
	onRevoke: () => void;
}

function RowActions({ onCopy, onRevoke }: RowActionsProps) {
	const [copied, setCopied] = useState(false);

	const handleCopy = useCallback(() => {
		onCopy();
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	}, [onCopy]);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="icon" className="h-8 w-8" aria-label="เปิดเมนูตัวเลือก">
					<LuEllipsis className="h-4 w-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-44">
				<DropdownMenuLabel>ตัวเลือก</DropdownMenuLabel>
				<DropdownMenuItem onClick={handleCopy} className="gap-2">
					{copied ? (
						<>
							<LuCheck className="w-4 h-4 text-green-500" />
							คัดลอกแล้ว!
						</>
					) : (
						<>
							<LuLink className="w-4 h-4" />
							คัดลอกลิงก์
						</>
					)}
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					onClick={onRevoke}
					className="gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
				>
					<LuTrash2 className="w-4 h-4" />
					ถอนสิทธิ์
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

interface RevokeConfirmDialogProps {
	open: boolean;
	count: number;
	onConfirm: () => void;
	onCancel: () => void;
}

function RevokeConfirmDialog({ open, count, onConfirm, onCancel }: RevokeConfirmDialogProps) {
	return (
		<AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>ถอนสิทธิ์การเข้าถึง {count} คน?</AlertDialogTitle>
					<AlertDialogDescription>
						การดำเนินการนี้จะยกเลิกสิทธิ์การเข้าถึงข้อมูลที่แชร์ของคุณ คุณสามารถเชิญใหม่ได้ในภายหลัง
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel onClick={onCancel}>ยกเลิก</AlertDialogCancel>
					<AlertDialogAction
						onClick={onConfirm}
						className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
					>
						ถอนสิทธิ์
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

interface AddFriendDialogProps {
	onSubmit: (data: { email: string; message?: string }) => Promise<void>;
}

function AddFriendDialog({ onSubmit }: AddFriendDialogProps) {
	const [email, setEmail] = useState("");
	const [message, setMessage] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [touched, setTouched] = useState(false);

	const emailError = touched && email.length > 0 && !isValidEmail(email);
	const canSubmit = isValidEmail(email) && !isSubmitting;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!canSubmit) return;

		setIsSubmitting(true);
		try {
			await onSubmit({
				email: email.trim(),
				message: message.trim() || undefined,
			});

			setEmail("");
			setMessage("");
			setTouched(false);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<DialogContent className="sm:max-w-md">
			<form onSubmit={handleSubmit}>
				<DialogHeader>
					<DialogTitle>เพิ่มเพื่อน</DialogTitle>
					<DialogDescription>
						เพื่อนจะได้รับคำเชิญผ่านอีเมล สามารถเพิ่มข้อความเพื่อบอกอะไรเขาได้นะ
					</DialogDescription>
				</DialogHeader>

				<div className="grid gap-4 py-4">
					<div className="grid gap-2">
						<Label htmlFor="invite-email">อีเมลของเพื่อน</Label>
						<Input
							id="invite-email"
							type="email"
							placeholder="name@example.com"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							onBlur={() => setTouched(true)}
							aria-invalid={emailError}
							aria-describedby={emailError ? "email-error" : undefined}
							autoComplete="email"
							autoFocus
						/>
						{emailError && (
							<p id="email-error" className="text-xs text-destructive">
								กรุณากรอกอีเมลที่ถูกต้อง
							</p>
						)}
					</div>

					<div className="grid gap-2">
						<Label htmlFor="invite-msg">
							ข้อความ <span className="text-muted-foreground font-normal">(ไม่จำเป็น)</span>
						</Label>
						<Input
							id="invite-msg"
							placeholder="มาเป็นเพื่อนกันมั้ย 👋"
							value={message}
							onChange={(e) => setMessage(e.target.value)}
							maxLength={200}
						/>
					</div>
				</div>

				<DialogFooter>
					<DialogClose asChild>
						<Button type="button" variant="outline">
							ยกเลิก
						</Button>
					</DialogClose>
					<Button type="submit" disabled={!canSubmit} className="gap-2">
						{isSubmitting ? (
							<LuLoader className="w-4 h-4 animate-spin" />
						) : (
							<LuUserPlus className="w-4 h-4" />
						)}
						ส่งคำเชิญ
					</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	);
}

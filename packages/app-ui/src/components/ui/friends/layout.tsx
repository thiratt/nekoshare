import { flexRender, type Table as TanstackTable } from "@tanstack/react-table";
import {
	LuChevronLeft,
	LuChevronRight,
	LuInbox,
	LuLoader,
	LuRefreshCcw,
	LuSend,
	LuTrash2,
	LuUserPlus,
	LuUsers,
} from "react-icons/lu";

import { Button } from "@workspace/ui/components/button";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Dialog, DialogTrigger } from "@workspace/ui/components/dialog";
import { SearchInput } from "@workspace/ui/components/search-input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";

import { CardTransition } from "@workspace/app-ui/components/ext/card-transition";
import type { FriendItem } from "@workspace/app-ui/types/friends";

import { FriendRequestCard } from "./components";
import { PAGE_SIZE } from "./constants";
import { AddFriendDialog } from "./dialogs";

interface FriendsHeaderProps {
	loading: boolean;
	query: string;
	selectedCount: number;
	isAddDialogOpen: boolean;
	onRefresh: () => void;
	onQueryChange: (query: string) => void;
	onClearQuery: () => void;
	onRevokeSelected: () => void;
	onAddDialogChange: (open: boolean) => void;
	onSendRequest: (userId: string) => Promise<void>;
}

interface FriendsTableProps {
	table: TanstackTable<FriendItem>;
	loading: boolean;
	columnsLength: number;
	searchQuery: string;
}

interface PaginationProps {
	currentPage: number;
	totalPages: number;
	totalItems: number;
	pageItems: number;
	onPageChange: (page: number) => void;
}

interface FriendsContentProps {
	error: string | null;
	children: React.ReactNode;
}

interface FriendsCardProps {
	children: React.ReactNode;
}

interface RequestsSectionProps {
	title: string;
	subtitle?: string;
	items: FriendItem[];
	onAccept?: (friendshipId: string) => void;
	onReject?: (friendshipId: string) => void;
	onCancel?: (friendshipId: string) => void;
	actionLoading?: string | null;
}

export function FriendsHeader({
	loading,
	query,
	selectedCount,
	isAddDialogOpen,
	onRefresh,
	onQueryChange,
	onClearQuery,
	onRevokeSelected,
	onAddDialogChange,
	onSendRequest,
}: FriendsHeaderProps) {
	return (
		<CardHeader>
			<div className="space-y-1">
				<CardTitle>เพื่อน</CardTitle>
				<CardDescription>คนที่สามารถแชร์ข้อมูลกับคุณได้</CardDescription>
			</div>
			<div className="flex">
				<div className="flex items-center gap-2">
					<Button variant="outline" onClick={onRefresh} disabled={loading}>
						<LuRefreshCcw className={loading ? "animate-spin" : ""} />
					</Button>
					<SearchInput
						placeholder="ค้นหา..."
						searchQuery={query}
						onSearchQuery={onQueryChange}
						onClearSearch={onClearQuery}
						className="w-64"
					/>
				</div>
				<div className="flex items-center ms-auto">
					{selectedCount > 0 && (
						<div className="flex items-center gap-2 mr-2">
							<span>{selectedCount} รายการที่เลือก</span>
							<Button variant="destructive" onClick={onRevokeSelected}>
								<LuTrash2 />
							</Button>
						</div>
					)}
					<Dialog open={isAddDialogOpen} onOpenChange={onAddDialogChange}>
						<DialogTrigger asChild>
							<Button className="gap-2">
								<LuUserPlus className="w-4 h-4" />
								เพิ่มเพื่อน
							</Button>
						</DialogTrigger>
						<AddFriendDialog onSubmit={onSendRequest} />
					</Dialog>
				</div>
			</div>
		</CardHeader>
	);
}

export function RequestsSection({
	title,
	subtitle,
	items,
	onAccept,
	onReject,
	onCancel,
	actionLoading,
}: RequestsSectionProps) {
	const isIncoming = items[0]?.status === "incoming";
	const Icon = isIncoming ? LuInbox : LuSend;

	return (
		<div className="mb-6">
			<div className="flex items-center gap-2 mb-3">
				<Icon className="w-4 h-4 text-muted-foreground" />
				<h3 className="font-semibold text-sm">{title}</h3>
				{subtitle && <span className="text-xs text-muted-foreground">({subtitle})</span>}
			</div>
			<div className="grid gap-2">
				{items.map((item) => (
					<FriendRequestCard
						key={item.friendshipId}
						friend={item}
						onAccept={onAccept}
						onReject={onReject}
						onCancel={onCancel}
						loading={actionLoading === item.friendshipId}
					/>
				))}
			</div>
		</div>
	);
}

export function FriendsTable({ table, loading, columnsLength, searchQuery }: FriendsTableProps) {
	return (
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
							<TableCell colSpan={columnsLength}>
								<div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
									<LuLoader className="w-4 h-4 animate-spin" /> กำลังโหลด
								</div>
							</TableCell>
						</TableRow>
					) : table.getRowModel().rows.length === 0 ? (
						<TableRow>
							<TableCell colSpan={columnsLength} className="text-center py-8">
								<div className="flex flex-col items-center gap-2 text-muted-foreground">
									<LuUsers className="w-8 h-8" />
									{searchQuery ? (
										<span>ไม่พบเพื่อนที่ตรงกับ &quot;{searchQuery}&quot;</span>
									) : (
										<>
											<span className="font-medium">ยังไม่มีเพื่อน</span>
											<span className="text-sm">เริ่มต้นด้วยการเพิ่มเพื่อนคนแรกของคุณ</span>
										</>
									)}
								</div>
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
	);
}

export function Pagination({ currentPage, totalPages, totalItems, pageItems, onPageChange }: PaginationProps) {
	const startItem = pageItems === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
	const endItem = (currentPage - 1) * PAGE_SIZE + pageItems;

	return (
		<div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
			<div>
				แสดง {startItem} - {endItem} จาก {totalItems}
			</div>
			<div className="flex items-center gap-2">
				<Button
					variant="outline"
					size="sm"
					onClick={() => onPageChange(Math.max(1, currentPage - 1))}
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
					onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
					disabled={currentPage === totalPages}
					aria-label="หน้าถัดไป"
				>
					<LuChevronRight className="w-4 h-4" />
				</Button>
			</div>
		</div>
	);
}

export function FriendsContent({ error, children }: FriendsContentProps) {
	return (
		<CardContent className="flex flex-col h-full">
			{error && <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">{error}</div>}
			{children}
		</CardContent>
	);
}

export function FriendsCard({ children }: FriendsCardProps) {
	return (
		<CardTransition className="h-full" tag="friend-share-card">
			{children}
		</CardTransition>
	);
}

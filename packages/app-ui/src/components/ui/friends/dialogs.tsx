import { memo, useCallback, useState } from "react";

import { LuCheck, LuLoader, LuSearch, LuUserPlus, LuX } from "react-icons/lu";

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
import { Button } from "@workspace/ui/components/button";
import {
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { ScrollArea } from "@workspace/ui/components/scroll-area";

import { useUserSearch } from "@workspace/app-ui/hooks/use-friends";
import type { UserSearchResult } from "@workspace/app-ui/types/friends";

import { getInitials } from "./constants";

interface RevokeConfirmDialogProps {
	open: boolean;
	count: number;
	onConfirm: () => void;
	onCancel: () => void;
}

interface AddFriendDialogProps {
	onSubmit: (userId: string) => Promise<void>;
}

export function RevokeConfirmDialog({ open, count, onConfirm, onCancel }: RevokeConfirmDialogProps) {
	return (
		<AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
			<AlertDialogContent className="max-w-sm">
				<AlertDialogHeader className="text-left">
					<AlertDialogTitle className="text-base font-semibold">ลบเพื่อน {count} คน?</AlertDialogTitle>
					<AlertDialogDescription className="text-sm text-neutral-500">
						การดำเนินการนี้จะลบเพื่อนออกจากรายการของคุณ คุณสามารถเพิ่มใหม่ได้ในภายหลัง
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter className="gap-2 sm:gap-2">
					<AlertDialogCancel onClick={onCancel} className="h-9 px-4 text-sm font-medium">
						ยกเลิก
					</AlertDialogCancel>
					<AlertDialogAction
						onClick={onConfirm}
						className="h-9 px-4 text-sm font-medium bg-red-600 text-white hover:bg-red-700"
					>
						ลบเพื่อน
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

const STATUS_LABELS: Record<Exclude<UserSearchResult["friendStatus"], "none">, { label: string; color: string }> = {
	friend: { label: "เพื่อนแล้ว", color: "text-emerald-600 dark:text-emerald-400" },
	outgoing: { label: "รอตอบรับ", color: "text-amber-600 dark:text-amber-400" },
	incoming: { label: "รอยอมรับ", color: "text-blue-600 dark:text-blue-400" },
	blocked: { label: "ถูกบล็อค", color: "text-red-600 dark:text-red-400" },
};

interface UserResultRowProps {
	user: UserSearchResult;
	onSelect: (user: UserSearchResult) => void;
}

const UserResultRow = memo(function UserResultRow({ user, onSelect }: UserResultRowProps) {
	const isAvailable = user.friendStatus === "none";
	const statusInfo = user.friendStatus !== "none" ? STATUS_LABELS[user.friendStatus] : null;

	return (
		<button
			type="button"
			className={`group flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${
				isAvailable ? "cursor-pointer hover:bg-muted" : "cursor-not-allowed opacity-60"
			}`}
			onClick={() => isAvailable && onSelect(user)}
			disabled={!isAvailable}
		>
			<Avatar className="h-9 w-9 shrink-0">
				<AvatarImage src={user.avatarUrl} alt={user.name} />
				<AvatarFallback className="bg-muted text-xs font-medium text-muted-foreground">
					{getInitials(user.name)}
				</AvatarFallback>
			</Avatar>
			<div className="min-w-0 flex-1">
				<p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">{user.name}</p>
				<p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{user.email}</p>
			</div>
			{statusInfo && (
				<span className={`shrink-0 text-xs font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
			)}
			{isAvailable && (
				<span className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
					<LuUserPlus className="h-4 w-4 text-muted-foreground" />
				</span>
			)}
		</button>
	);
});

export function AddFriendDialog({ onSubmit }: AddFriendDialogProps) {
	const { query, setQuery, results, loading, clearSearch } = useUserSearch();
	const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const canSubmit = selectedUser !== null && !isSubmitting && selectedUser.friendStatus === "none";

	const resetForm = useCallback(() => {
		clearSearch();
		setSelectedUser(null);
		setError(null);
	}, [clearSearch]);

	const handleSelectUser = useCallback((user: UserSearchResult) => {
		setSelectedUser(user);
		setError(null);
	}, []);

	const handleClearSelection = useCallback(() => {
		setSelectedUser(null);
		setError(null);
	}, []);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!canSubmit || !selectedUser) return;

		setIsSubmitting(true);
		setError(null);
		try {
			await onSubmit(selectedUser.id);
			resetForm();
		} catch (err) {
			setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
		} finally {
			setIsSubmitting(false);
		}
	};

	const showResults = !selectedUser && query.length >= 1;
	const showEmpty = showResults && !loading && results.length === 0;
	const showList = showResults && results.length > 0;

	return (
		<DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
			<form onSubmit={handleSubmit} className="flex flex-col">
				<DialogHeader className="border-b px-5 py-4">
					<DialogTitle className="text-base font-semibold">เพิ่มเพื่อน</DialogTitle>
					<DialogDescription>ค้นหาด้วยอีเมลหรือชื่อ</DialogDescription>
				</DialogHeader>

				<div className="flex flex-col">
					{!selectedUser && (
						<div className="relative border-b">
							<LuSearch className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								placeholder="พิมพ์เพื่อค้นหา..."
								value={query}
								onChange={(e) => setQuery(e.target.value)}
								className="h-12 rounded-none border-0 bg-transparent pl-11 pr-11 text-sm placeholder:text-muted-foreground focus-visible:ring-0"
								autoFocus
							/>
							{loading && (
								<LuLoader className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
							)}
						</div>
					)}

					<div className="h-64">
						{!selectedUser && query.length === 0 && (
							<div className="flex h-full flex-col items-center justify-center text-center">
								<div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
									<LuUserPlus className="h-6 w-6 text-muted-foreground" />
								</div>
								<p>ค้นหาเพื่อนใหม่</p>
								<p className="mt-1 text-sm text-muted-foreground">พิมพ์ชื่อหรืออีเมลเพื่อเริ่มค้นหา</p>
							</div>
						)}

						{showList && (
							<ScrollArea className="h-full">
								<div className="py-1">
									{results.map((user) => (
										<UserResultRow key={user.id} user={user} onSelect={handleSelectUser} />
									))}
								</div>
							</ScrollArea>
						)}

						{!selectedUser && query.length >= 1 && loading && results.length === 0 && (
							<div className="flex h-full flex-col items-center justify-center text-center">
								<LuLoader className="mb-3 h-6 w-6 animate-spin text-muted-foreground" />
								<p className="text-sm text-muted-foreground">กำลังค้นหา...</p>
							</div>
						)}

						{showEmpty && (
							<div className="flex h-full flex-col items-center justify-center text-center">
								<div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
									<LuSearch className="h-6 w-6 text-muted-foreground" />
								</div>
								<p>ไม่พบผู้ใช้</p>
								<p className="mt-1 text-sm text-muted-foreground">ลองค้นหาด้วยคำอื่น</p>
							</div>
						)}

						{selectedUser && (
							<div className="flex h-full items-center justify-center">
								<div className="flex flex-col items-center gap-3 text-center">
									<div className="relative">
										<Avatar className="h-16 w-16">
											<AvatarImage src={selectedUser.avatarUrl} alt={selectedUser.name} />
											<AvatarFallback className="bg-muted text-lg font-medium text-muted-foreground">
												{getInitials(selectedUser.name)}
											</AvatarFallback>
										</Avatar>
										<div className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-white dark:ring-neutral-900">
											<LuCheck className="h-3.5 w-3.5 text-white" />
										</div>
									</div>
									<div>
										<p>{selectedUser.name}</p>
										<p className="text-sm text-muted-foreground">{selectedUser.email}</p>
									</div>
									<Button
										type="button"
										variant="outline"
										size="sm"
										className="mt-1 h-8 gap-1.5"
										onClick={handleClearSelection}
									>
										<LuX className="h-3.5 w-3.5" />
										เลือกคนอื่น
									</Button>
								</div>
							</div>
						)}
					</div>

					{error && (
						<div className="mx-4 mb-3 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600 dark:bg-red-950/50 dark:text-red-400">
							{error}
						</div>
					)}
				</div>

				<DialogFooter className="border-t border-neutral-200 px-4 py-3 dark:border-neutral-800">
					<DialogClose asChild>
						<Button
							type="button"
							variant="ghost"
							className="h-9 px-4 text-sm font-medium"
							onClick={resetForm}
						>
							ยกเลิก
						</Button>
					</DialogClose>
					<Button type="submit" disabled={!canSubmit} className="h-9 gap-2 px-4 text-sm font-medium">
						{isSubmitting ? (
							<LuLoader className="h-4 w-4 animate-spin" />
						) : (
							<LuUserPlus className="h-4 w-4" />
						)}
						ส่งคำขอ
					</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	);
}

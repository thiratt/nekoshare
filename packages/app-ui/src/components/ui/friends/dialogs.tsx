import { useCallback, useState } from "react";

import { LuLoader, LuSearch, LuUserPlus, LuX } from "react-icons/lu";

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
import {
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";

import { useUserSearch } from "@workspace/app-ui/hooks/use-friends";
import type { UserSearchResult } from "@workspace/app-ui/types/friends";

import { getInitials, STATUS_CONFIG } from "./constants";

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
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>ลบเพื่อน {count} คน?</AlertDialogTitle>
					<AlertDialogDescription>
						การดำเนินการนี้จะลบเพื่อนออกจากรายการของคุณ คุณสามารถเพิ่มใหม่ได้ในภายหลัง
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel onClick={onCancel}>ยกเลิก</AlertDialogCancel>
					<AlertDialogAction
						onClick={onConfirm}
						className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
					>
						ลบเพื่อน
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

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

	const handleSelectUser = (user: UserSearchResult) => {
		setSelectedUser(user);
		setQuery("");
		setError(null);
	};

	const handleClearSelection = () => {
		setSelectedUser(null);
		setError(null);
	};

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

	const getStatusMessage = (user: UserSearchResult) => {
		switch (user.friendStatus) {
			case "friend":
				return "เป็นเพื่อนกันแล้ว";
			case "outgoing":
				return "ส่งคำขอแล้ว รอการตอบรับ";
			case "incoming":
				return "มีคำขอจากคนนี้ ไปยอมรับได้เลย";
			case "blocked":
				return "ถูกบล็อค";
			default:
				return null;
		}
	};

	return (
		<DialogContent className="sm:max-w-md">
			<form onSubmit={handleSubmit}>
				<DialogHeader>
					<DialogTitle>เพิ่มเพื่อน</DialogTitle>
					<DialogDescription>
						ค้นหาเพื่อนด้วยอีเมลหรือชื่อ เมื่อส่งคำขอแล้ว เพื่อนจะได้รับแจ้งเตือนและสามารถยอมรับได้
					</DialogDescription>
				</DialogHeader>

				<div className="grid gap-4 py-4">
					{!selectedUser && (
						<div className="relative">
							<div className="relative">
								<LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
								<Input
									placeholder="ค้นหาด้วยอีเมลหรือชื่อ..."
									value={query}
									onChange={(e) => setQuery(e.target.value)}
									className="pl-9"
									autoFocus
								/>
								{loading && (
									<LuLoader className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
								)}
							</div>

							{results.length > 0 && (
								<div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg z-50 max-h-64 overflow-auto">
									{results.map((user) => {
										const statusMessage = getStatusMessage(user);
										const isDisabled = user.friendStatus !== "none";

										return (
											<button
												key={user.id}
												type="button"
												className={`w-full flex items-center gap-3 p-3 hover:bg-accent text-left transition-colors ${
													isDisabled ? "opacity-70 cursor-not-allowed" : "cursor-pointer"
												}`}
												onClick={() => !isDisabled && handleSelectUser(user)}
												disabled={isDisabled}
											>
												<Avatar className="h-9 w-9">
													<AvatarImage src={user.avatarUrl} alt={user.name} />
													<AvatarFallback className="text-xs">
														{getInitials(user.name)}
													</AvatarFallback>
												</Avatar>
												<div className="min-w-0 flex-1">
													<div className="font-medium truncate">{user.name}</div>
													<div className="text-xs text-muted-foreground truncate">
														{user.email}
													</div>
													{statusMessage && (
														<div className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
															{statusMessage}
														</div>
													)}
												</div>
												{user.friendStatus !== "none" && (
													<Badge
														variant={STATUS_CONFIG[user.friendStatus].variant}
														className="text-xs"
													>
														{STATUS_CONFIG[user.friendStatus].label}
													</Badge>
												)}
											</button>
										);
									})}
								</div>
							)}

							{query.length >= 2 && !loading && results.length === 0 && (
								<div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg p-4 text-center text-muted-foreground text-sm z-10">
									ไม่พบผู้ใช้ที่ตรงกับ &quot;{query}&quot;
								</div>
							)}
						</div>
					)}

					{selectedUser && (
						<div className="flex items-center gap-3 p-3 rounded-lg border bg-accent/50">
							<Avatar className="h-10 w-10">
								<AvatarImage src={selectedUser.avatarUrl} alt={selectedUser.name} />
								<AvatarFallback>{getInitials(selectedUser.name)}</AvatarFallback>
							</Avatar>
							<div className="min-w-0 flex-1">
								<div className="font-medium truncate">{selectedUser.name}</div>
								<div className="text-xs text-muted-foreground truncate">{selectedUser.email}</div>
							</div>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="h-8 w-8"
								onClick={handleClearSelection}
							>
								<LuX className="w-4 h-4" />
							</Button>
						</div>
					)}

					{error && <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">{error}</div>}
				</div>

				<DialogFooter>
					<DialogClose asChild>
						<Button type="button" variant="outline" onClick={resetForm}>
							ยกเลิก
						</Button>
					</DialogClose>
					<Button type="submit" disabled={!canSubmit} className="gap-2">
						{isSubmitting ? (
							<LuLoader className="w-4 h-4 animate-spin" />
						) : (
							<LuUserPlus className="w-4 h-4" />
						)}
						ส่งคำขอ
					</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	);
}

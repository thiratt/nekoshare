import { useCallback, useState } from "react";

import { LuCheck, LuLoader, LuSearch, LuUserPlus, LuX } from "react-icons/lu";

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

import { getInitials } from "../utils/friend-utils";
import { UserResultRow } from "./UserResultRow";

type AddFriendDialogProps = {
	onSubmit: (userId: string) => Promise<void>;
};

export function AddFriendDialog({ onSubmit }: AddFriendDialogProps) {
	const { clearSearch, loading, query, results, setQuery } = useUserSearch();
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

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();
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
	const showIdle = !selectedUser && query.length === 0;
	const showLoading = !selectedUser && query.length >= 1 && loading && results.length === 0;

	return (
		<DialogContent className="overflow-hidden p-0 sm:max-w-lg">
			<form onSubmit={handleSubmit} className="flex max-h-[min(680px,calc(100vh-4rem))] flex-col">
				<DialogHeader className="space-y-1 border-b p-4">
					<div className="flex items-start justify-between gap-4">
						<div>
							<DialogTitle className="text-base font-semibold">เพิ่มเพื่อน</DialogTitle>
							<DialogDescription>ค้นหาคนที่คุณไว้ใจเพื่อแชร์ไฟล์ด้วยได้โดยตรง</DialogDescription>
						</div>
					</div>
				</DialogHeader>

				<div className="border-b bg-muted/25 px-4 py-3">
					{!selectedUser ? (
						<div className="relative">
							<LuSearch className="absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-muted-foreground" />

							<Input
								placeholder="ค้นหาด้วยชื่อหรืออีเมล"
								value={query}
								onChange={(event) => setQuery(event.target.value)}
								className="h-11 rounded-full border bg-background pr-10 pl-10 text-sm shadow-sm"
								autoFocus
							/>

							{loading ? (
								<LuLoader className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
							) : query ? (
								<button
									type="button"
									className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
									onClick={() => {
										clearSearch();
										setError(null);
									}}
									aria-label="ล้างการค้นหา"
								>
									<LuX className="size-4" />
								</button>
							) : null}
						</div>
					) : (
						<div className="flex items-center justify-between gap-3 rounded-2xl border bg-background p-3 shadow-sm">
							<div className="flex min-w-0 items-center gap-3">
								<Avatar className="size-10">
									<AvatarImage src={selectedUser.avatarUrl} alt={selectedUser.name} />
									<AvatarFallback className="bg-muted font-medium text-muted-foreground">
										{getInitials(selectedUser.name)}
									</AvatarFallback>
								</Avatar>

								<div className="min-w-0">
									<p className="truncate text-sm font-medium">{selectedUser.name}</p>
									<p className="truncate text-xs text-muted-foreground">{selectedUser.email}</p>
								</div>
							</div>

							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="shrink-0 rounded-full"
								onClick={handleClearSelection}
							>
								<LuX className="size-3.5" />
								เปลี่ยน
							</Button>
						</div>
					)}
				</div>

				<div className="min-h-80 flex-1 overflow-hidden">
					{showIdle ? (
						<div className="flex h-full flex-col justify-between">
							<div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
								<div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
									<LuUserPlus className="size-7" />
								</div>

								<p className="font-medium">ค้นหาเพื่อนใหม่</p>
								<p className="mt-1 max-w-xs text-sm leading-6 text-muted-foreground">
									พิมพ์ชื่อหรืออีเมลเพื่อค้นหาผู้ใช้ แล้วส่งคำขอเป็นเพื่อน
								</p>
							</div>
						</div>
					) : null}

					{showList ? (
						<ScrollArea className="h-full">
							<div className="p-2">
								{results.map((user) => (
									<UserResultRow key={user.id} user={user} onSelect={handleSelectUser} />
								))}
							</div>
						</ScrollArea>
					) : null}

					{showLoading ? (
						<div className="flex h-full flex-col items-center justify-center text-center">
							<LuLoader className="mb-3 size-6 animate-spin text-muted-foreground" />
							<p className="text-sm text-muted-foreground">กำลังค้นหา...</p>
						</div>
					) : null}

					{showEmpty ? (
						<div className="flex h-full flex-col items-center justify-center px-8 text-center">
							<div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-muted">
								<LuSearch className="size-7 text-muted-foreground" />
							</div>

							<p className="font-medium">ไม่พบผู้ใช้</p>
							<p className="mt-1 max-w-xs text-sm leading-6 text-muted-foreground">
								ลองค้นหาด้วยอีเมลเต็ม หรือชื่อที่อีกฝ่ายใช้ใน Neko Share
							</p>
						</div>
					) : null}

					{selectedUser ? (
						<div className="flex h-full flex-col items-center justify-center px-8 text-center">
							<div className="relative mb-4">
								<Avatar className="size-20">
									<AvatarImage src={selectedUser.avatarUrl} alt={selectedUser.name} />
									<AvatarFallback className="bg-muted text-xl font-medium text-muted-foreground">
										{getInitials(selectedUser.name)}
									</AvatarFallback>
								</Avatar>

								<div className="absolute -right-1 -bottom-1 flex size-7 items-center justify-center rounded-full bg-emerald-500 ring-4 ring-background">
									<LuCheck className="size-4 text-white" />
								</div>
							</div>

							<p className="text-base font-medium">{selectedUser.name}</p>
							<p className="mt-0.5 text-sm text-muted-foreground">{selectedUser.email}</p>
						</div>
					) : null}
				</div>

				{error ? (
					<div className="mx-4 mb-3 rounded-xl bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
						{error}
					</div>
				) : null}

				<DialogFooter className="m-0 border-t bg-muted/20">
					<DialogClose asChild>
						<Button type="button" variant="ghost" className="rounded-full" onClick={resetForm}>
							ยกเลิก
						</Button>
					</DialogClose>

					<Button type="submit" disabled={!canSubmit} className="rounded-full">
						{isSubmitting ? <LuLoader className="size-4 animate-spin" /> : <LuUserPlus className="size-4" />}
						ส่งคำขอ
					</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	);
}

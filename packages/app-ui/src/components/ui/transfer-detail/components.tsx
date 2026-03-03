import { useMemo } from "react";

import { AnimatePresence, motion } from "motion/react";
import {
	LuChevronDown,
	LuCircleAlert,
	LuCircleCheck,
	LuCirclePause,
	LuCircleX,
	LuClock3,
	LuFolderOpen,
	LuLock,
	LuLockOpen,
	LuMonitor,
	LuPause,
	LuPlay,
	LuRefreshCcw,
	LuSend,
	LuX,
} from "react-icons/lu";

import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { CardFooter } from "@workspace/ui/components/card";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@workspace/ui/components/collapsible";
import { Progress } from "@workspace/ui/components/progress";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Separator } from "@workspace/ui/components/separator";
import { cn } from "@workspace/ui/lib/utils";

import { fileStatusColor, fileStatusLabel, FINISHED_STATUSES, transferStatusConfig } from "./constants";
import type { EncryptionType, TransferFileItem, TransferFileStatus, TransferRecipient, TransferStatus } from "./types";

export function StatusBadge({ status }: { status: TransferStatus }) {
	const config = transferStatusConfig(status);
	return (
		<Badge variant={config.variant} className={cn("rounded-full border text-xs font-medium", config.className)}>
			{config.label}
		</Badge>
	);
}

export function EncryptionBadge({ encryption }: { encryption: EncryptionType }) {
	if (encryption === "encrypted") {
		return (
			<div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
				<LuLock className="size-3.5" />
				<span className="font-medium">Encrypted</span>
			</div>
		);
	}
	return (
		<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
			<LuLockOpen className="size-3.5" />
			<span className="font-medium">Not encrypted</span>
		</div>
	);
}

export function FileStatusIcon({ status }: { status: TransferFileStatus }) {
	if (status === "success") {
		return <LuCircleCheck className="text-emerald-500" />;
	}
	if (status === "transferring") {
		return <LuSend className="text-blue-500" />;
	}
	if (status === "failed") {
		return <LuCircleAlert className="text-red-500" />;
	}
	if (status === "paused") {
		return <LuCirclePause className="text-amber-500" />;
	}
	if (status === "cancelled") {
		return <LuCircleX className="text-muted-foreground" />;
	}
	return <LuClock3 className="text-muted-foreground" />;
}

interface FileRowProps {
	file: TransferFileItem;
	isLast: boolean;
	selectable?: boolean;
	selected?: boolean;
	onSelectChange?: (id: string, checked: boolean) => void;
	onPauseFile?: (id: string) => void;
	onCancelFile?: (id: string) => void;
}

export function FileRow({
	file,
	isLast,
	selectable = false,
	selected = false,
	onSelectChange,
	onPauseFile,
	onCancelFile,
}: FileRowProps) {
	const showProgress = file.status === "transferring" || file.status === "success" || file.status === "paused";
	const canPause = file.status === "transferring" || file.status === "paused";
	const canCancel = file.status === "transferring" || file.status === "queued" || file.status === "paused";
	const label = fileStatusLabel(file.status);

	return (
		<>
			<div className="flex items-center gap-3 px-4 py-3">
				{selectable && canCancel && (
					<Checkbox
						checked={selected}
						onCheckedChange={(checked) => onSelectChange?.(file.id, checked === true)}
						className="shrink-0"
					/>
				)}
				<div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted">
					<FileStatusIcon status={file.status} />
				</div>
				<div className="min-w-0 flex-1">
					<div className="flex items-center justify-between gap-2">
						<p className="truncate text-sm font-medium">{file.name}</p>
						<span className={cn("shrink-0 text-xs font-medium tabular-nums", fileStatusColor(file.status))}>
							{label ?? `${file.progress}%`}
						</span>
					</div>
					<p className="mt-0.5 text-xs text-muted-foreground">{file.sizeLabel}</p>
					{file.error && <p className="mt-0.5 text-xs text-red-500">{file.error}</p>}
					{showProgress && <Progress value={file.progress} className="mt-2 h-1.5" />}
				</div>
				{selectable && (canPause || canCancel) && (
					<div className="flex shrink-0 items-center gap-1">
						{canPause && (
							<Button
								variant="ghost"
								size="icon"
								className="rounded-full text-muted-foreground hover:text-foreground"
								onClick={() => onPauseFile?.(file.id)}
							>
								{file.status === "paused" ? <LuPlay /> : <LuPause />}
							</Button>
						)}
						{canCancel && (
							<Button
								variant="ghost"
								size="icon"
								className="rounded-full text-muted-foreground hover:text-destructive"
								onClick={() => onCancelFile?.(file.id)}
							>
								<LuX />
							</Button>
						)}
					</div>
				)}
			</div>
			{!isLast && <Separator className={cn(selectable ? "ml-20" : "ml-16")} />}
		</>
	);
}

export function CompletedFileRow({ file, isLast }: { file: TransferFileItem; isLast: boolean }) {
	const label = fileStatusLabel(file.status);

	return (
		<>
			<div className="flex items-center gap-3 px-4 py-2.5">
				<div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted/60">
					<FileStatusIcon status={file.status} />
				</div>
				<div className="min-w-0 flex-1">
					<div className="flex items-center justify-between gap-2">
						<p className="truncate text-sm text-muted-foreground">{file.name}</p>
						<span className={cn("shrink-0 text-xs font-medium", fileStatusColor(file.status))}>
							{label ?? `${file.progress}%`}
						</span>
					</div>
					<p className="mt-0.5 text-xs text-muted-foreground/70">{file.sizeLabel}</p>
				</div>
			</div>
			{!isLast && <Separator className="ml-15" />}
		</>
	);
}

interface SelectionToolbarProps {
	selectedCount: number;
	totalSelectable: number;
	onSelectAll: () => void;
	onDeselectAll: () => void;
	onPauseSelected: () => void;
	onCancelSelected: () => void;
}

export function SelectionToolbar({
	selectedCount,
	totalSelectable,
	onSelectAll,
	onDeselectAll,
	onPauseSelected,
	onCancelSelected,
}: SelectionToolbarProps) {
	if (selectedCount === 0) return null;

	const allSelected = selectedCount === totalSelectable;

	return (
		<div className="flex items-center gap-2 border-t bg-muted/30 px-6 py-2.5">
			<Checkbox
				checked={allSelected}
				onCheckedChange={(checked) => (checked ? onSelectAll() : onDeselectAll())}
				className="shrink-0"
			/>
			<span className="text-xs font-medium text-muted-foreground">{selectedCount} selected</span>
			<div className="flex-1" />
			<Button variant="outline" size="sm" className="h-7 rounded-full text-xs" onClick={onPauseSelected}>
				<LuPause className="size-3" />
				Pause
			</Button>
			<Button
				variant="outline"
				size="sm"
				className="h-7 rounded-full text-xs text-destructive hover:text-destructive"
				onClick={onCancelSelected}
			>
				<LuX className="size-3" />
				Cancel
			</Button>
		</div>
	);
}

export function TransferringFooter({
	isPaused,
	onPauseToggle,
	onOpenFolder,
	onCancel,
}: {
	isPaused: boolean;
	onPauseToggle?: () => void;
	onOpenFolder?: () => void;
	onCancel?: () => void;
}) {
	return (
		<CardFooter className="flex-wrap gap-2 border-t pt-4">
			<Button variant="secondary" className="rounded-full" onClick={onPauseToggle}>
				{isPaused ? <LuPlay /> : <LuPause />}
				{isPaused ? "Resume All" : "Pause All"}
			</Button>
			<Button variant="outline" className="rounded-full" onClick={onOpenFolder}>
				<LuFolderOpen />
				Open Folder
			</Button>
			<div className="flex-1" />
			<Button variant="destructive" className="rounded-full" onClick={onCancel}>
				<LuX />
				Cancel All
			</Button>
		</CardFooter>
	);
}

export function CompletedFooter({ onOpenFolder, onDone }: { onOpenFolder?: () => void; onDone?: () => void }) {
	return (
		<CardFooter className="flex-wrap gap-2 border-t pt-4">
			<Button variant="outline" className="rounded-full" onClick={onOpenFolder}>
				<LuFolderOpen />
				Open Folder
			</Button>
			<div className="flex-1" />
			<Button className="rounded-full" onClick={onDone}>
				Done
			</Button>
		</CardFooter>
	);
}

export function FailedFooter({ onRetry, onCancel }: { onRetry?: () => void; onCancel?: () => void }) {
	return (
		<CardFooter className="flex-wrap gap-2 border-t pt-4">
			<Button variant="secondary" className="rounded-full" onClick={onRetry}>
				<LuRefreshCcw />
				Retry
			</Button>
			<div className="flex-1" />
			<Button variant="destructive" className="rounded-full" onClick={onCancel}>
				<LuX />
				Cancel
			</Button>
		</CardFooter>
	);
}

function RecipientAvatar({
	deviceName,
	avatar,
	size = "md",
}: {
	deviceName: string;
	avatar?: string;
	size?: "sm" | "md";
}) {
	const initials = deviceName
		.split(/[\s'-]+/)
		.slice(0, 2)
		.map((w) => w[0])
		.join("")
		.toUpperCase();

	return (
		<Avatar className={cn("shrink-0", size === "sm" ? "size-7" : "size-9")}>
			{avatar && <AvatarImage src={avatar} alt={deviceName} />}
			<AvatarFallback className="bg-accent text-xs font-medium border border-primary">
				{initials || <LuMonitor className={size === "sm" ? "size-3" : "size-4"} />}
			</AvatarFallback>
		</Avatar>
	);
}

function recipientBorderColor(status: TransferStatus) {
	switch (status) {
		case "transferring":
			return "border-l-blue-500";
		case "completed":
			return "border-l-emerald-500";
		case "failed":
			return "border-l-red-500";
	}
}

interface RecipientSectionProps {
	recipient: TransferRecipient;
	selectable?: boolean;
	selectedIds: Set<string>;
	onSelectChange?: (id: string, checked: boolean) => void;
	onPauseFile?: (fileId: string) => void;
	onCancelFile?: (fileId: string) => void;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function RecipientSection({
	recipient,
	selectable = false,
	selectedIds,
	onSelectChange,
	onPauseFile,
	onCancelFile,
	open,
	onOpenChange,
}: RecipientSectionProps) {
	const recipientProgress = useMemo(() => {
		if (!recipient.files.length) return 0;
		const sum = recipient.files.reduce((acc, f) => acc + f.progress, 0);
		return Math.round(sum / recipient.files.length);
	}, [recipient.files]);

	const activeFiles = useMemo(
		() => recipient.files.filter((f) => !FINISHED_STATUSES.has(f.status)),
		[recipient.files],
	);
	const finishedFiles = useMemo(
		() => recipient.files.filter((f) => FINISHED_STATUSES.has(f.status)),
		[recipient.files],
	);

	const completedCount = recipient.files.filter((f) => f.status === "success").length;
	const failedCount = recipient.files.filter((f) => f.status === "failed").length;
	const config = transferStatusConfig(recipient.status);

	const summaryParts: string[] = [];
	if (activeFiles.length > 0) summaryParts.push(`${activeFiles.length} active`);
	if (completedCount > 0) summaryParts.push(`${completedCount} done`);
	if (failedCount > 0) summaryParts.push(`${failedCount} failed`);

	return (
		<Collapsible
			open={open}
			onOpenChange={onOpenChange}
			className={cn(
				"overflow-clip rounded-xl border border-l-[3px] bg-card",
				recipientBorderColor(recipient.status),
			)}
		>
			<CollapsibleTrigger className="sticky top-9 z-10 flex w-full gap-3 bg-card px-4 py-3 text-left transition-colors hover:bg-muted/40 data-[state=open]:bg-muted">
				<RecipientAvatar deviceName={recipient.deviceName} avatar={recipient.avatar} />
				<div className="min-w-0 flex-1 transition-all">
					<div className="flex items-center gap-2">
						<p className="truncate text-sm font-medium">{recipient.deviceName}</p>
						<Badge
							variant={config.variant}
							className={cn("rounded-full border px-1.5 py-0 text-[10px] font-medium", config.className)}
						>
							{config.label}
						</Badge>
						<EncryptionBadge encryption={recipient.encryption} />
					</div>

					<div className="mt-1.5 flex items-center gap-2">
						<Progress value={recipientProgress} className="h-1.5 flex-1" />
						<span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
							{recipientProgress}%
						</span>
					</div>
					<AnimatePresence initial={false}>
						{!open && summaryParts.length > 0 && (
							<motion.p
								initial={{ opacity: 0, height: 0 }}
								animate={{ opacity: 1, height: "auto" }}
								exit={{ opacity: 0, height: 0 }}
								className="text-[11px] text-muted-foreground"
							>
								{summaryParts.join(" · ")}
							</motion.p>
						)}
					</AnimatePresence>
				</div>
				<LuChevronDown
					className={cn(
						"size-4 shrink-0 text-muted-foreground transition-transform duration-200",
						open && "rotate-180",
					)}
				/>
			</CollapsibleTrigger>

			<CollapsibleContent>
				<Separator />

				{recipient.status === "failed" && recipient.errorMessage && (
					<div className="mx-3 mt-3 flex items-center gap-2 rounded-lg bg-red-50 p-2.5 dark:bg-red-950/50">
						<LuCircleAlert className="size-3.5 shrink-0 text-red-500" />
						<p className="text-xs text-red-600 dark:text-red-400">{recipient.errorMessage}</p>
					</div>
				)}

				<div className="p-3">
					<div className="overflow-hidden rounded-lg border bg-background">
						{activeFiles.map((file, i) => (
							<FileRow
								key={file.id}
								file={file}
								isLast={i === activeFiles.length - 1 && finishedFiles.length === 0}
								selectable={selectable && recipient.status === "transferring"}
								selected={selectedIds.has(file.id)}
								onSelectChange={onSelectChange}
								onPauseFile={onPauseFile}
								onCancelFile={onCancelFile}
							/>
						))}

						{activeFiles.length > 0 && finishedFiles.length > 0 && (
							<div className="flex items-center gap-2 bg-muted/30 px-4 py-1.5">
								<div className="h-px flex-1 bg-border" />
								<span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
									Finished
								</span>
								<div className="h-px flex-1 bg-border" />
							</div>
						)}

						{finishedFiles.map((file, i) => (
							<CompletedFileRow key={file.id} file={file} isLast={i === finishedFiles.length - 1} />
						))}
					</div>
				</div>
			</CollapsibleContent>
		</Collapsible>
	);
}

interface RecipientListItemProps {
	recipient: TransferRecipient;
	isSelected: boolean;
	onClick: () => void;
}

export function RecipientListItem({ recipient, isSelected, onClick }: RecipientListItemProps) {
	const recipientProgress = useMemo(() => {
		if (!recipient.files.length) return 0;
		const sum = recipient.files.reduce((acc, f) => acc + f.progress, 0);
		return Math.round(sum / recipient.files.length);
	}, [recipient.files]);

	const completedCount = recipient.files.filter((f) => f.status === "success").length;
	const config = transferStatusConfig(recipient.status);

	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
				isSelected ? "bg-accent" : "hover:bg-muted/50",
			)}
		>
			<RecipientAvatar deviceName={recipient.deviceName} avatar={recipient.avatar} />
			<div className="min-w-0 flex-1">
				<p className="truncate text-sm font-medium">{recipient.deviceName}</p>
				<div className="mt-1 flex items-center gap-2">
					<Progress value={recipientProgress} className="h-1 flex-1" />
					<span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
						{completedCount}/{recipient.files.length}
					</span>
				</div>
			</div>
			<Badge
				variant={config.variant}
				className={cn("shrink-0 rounded-full border px-1.5 py-0 text-[10px] font-medium", config.className)}
			>
				{config.label}
			</Badge>
		</button>
	);
}

interface RecipientDetailPanelProps {
	recipient: TransferRecipient;
	selectable?: boolean;
	selectedIds: Set<string>;
	onSelectChange?: (id: string, checked: boolean) => void;
	onPauseFile?: (fileId: string) => void;
	onCancelFile?: (fileId: string) => void;
}

export function RecipientDetailPanel({
	recipient,
	selectable = false,
	selectedIds,
	onSelectChange,
	onPauseFile,
	onCancelFile,
}: RecipientDetailPanelProps) {
	const recipientProgress = useMemo(() => {
		if (!recipient.files.length) return 0;
		const sum = recipient.files.reduce((acc, f) => acc + f.progress, 0);
		return Math.round(sum / recipient.files.length);
	}, [recipient.files]);

	const activeFiles = useMemo(
		() => recipient.files.filter((f) => !FINISHED_STATUSES.has(f.status)),
		[recipient.files],
	);
	const finishedFiles = useMemo(
		() => recipient.files.filter((f) => FINISHED_STATUSES.has(f.status)),
		[recipient.files],
	);

	const completedCount = recipient.files.filter((f) => f.status === "success").length;
	const config = transferStatusConfig(recipient.status);

	return (
		<div className="flex h-full flex-col">
			<div className="border-b px-5 py-4">
				<div className="flex items-center gap-3">
					<RecipientAvatar deviceName={recipient.deviceName} avatar={recipient.avatar} />
					<div className="min-w-0 flex-1">
						<div className="flex items-center gap-2">
							<p className="truncate text-sm font-semibold">{recipient.deviceName}</p>
							<Badge
								variant={config.variant}
								className={cn(
									"rounded-full border px-1.5 py-0 text-[10px] font-medium",
									config.className,
								)}
							>
								{config.label}
							</Badge>
						</div>
						<p className="mt-0.5 text-xs text-muted-foreground">
							{completedCount}/{recipient.files.length} files · {recipientProgress}%
						</p>
					</div>
					<EncryptionBadge encryption={recipient.encryption} />
				</div>
				<Progress value={recipientProgress} className="mt-3 h-1.5" />
			</div>

			<ScrollArea className="flex-1">
				{activeFiles.length > 0 && (
					<div className="px-4 pt-4">
						<div className="mb-1.5 flex items-center justify-between px-1">
							<p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
								Active
							</p>
							<p className="text-[10px] text-muted-foreground">{activeFiles.length}</p>
						</div>
						<div className="overflow-hidden rounded-xl border bg-card">
							{activeFiles.map((file, i) => (
								<FileRow
									key={file.id}
									file={file}
									isLast={i === activeFiles.length - 1}
									selectable={selectable && recipient.status === "transferring"}
									selected={selectedIds.has(file.id)}
									onSelectChange={onSelectChange}
									onPauseFile={onPauseFile}
									onCancelFile={onCancelFile}
								/>
							))}
						</div>
					</div>
				)}

				{finishedFiles.length > 0 && (
					<div className="px-4 pb-4 pt-4">
						<div className="mb-1.5 flex items-center justify-between px-1">
							<p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
								Completed
							</p>
							<p className="text-[10px] text-muted-foreground">{finishedFiles.length}</p>
						</div>
						<div className="overflow-hidden rounded-xl border border-dashed bg-muted/20">
							{finishedFiles.map((file, i) => (
								<CompletedFileRow key={file.id} file={file} isLast={i === finishedFiles.length - 1} />
							))}
						</div>
					</div>
				)}

				{recipient.status === "failed" && recipient.errorMessage && (
					<div className="mx-4 mb-4 mt-2 flex items-center gap-2 rounded-xl bg-red-50 p-3 dark:bg-red-950/50">
						<LuCircleAlert className="size-4 shrink-0 text-red-500" />
						<p className="text-xs text-red-600 dark:text-red-400">{recipient.errorMessage}</p>
					</div>
				)}

				{activeFiles.length === 0 && finishedFiles.length === 0 && (
					<div className="flex items-center justify-center py-12">
						<p className="text-sm text-muted-foreground">No files</p>
					</div>
				)}
			</ScrollArea>
		</div>
	);
}

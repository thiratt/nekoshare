import { memo } from "react";

import { LuExternalLink, LuEye, LuFolderOpen, LuTrash } from "react-icons/lu";

import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";

import { formatFileSize, formatRelativeTime, getFileKind, getReceivedFileIcon } from "../utils/file-utils";
import type { FilesPageItem } from "../types";

type FileRowProps = {
	file: FilesPageItem;
	selected: boolean;
	onInspect: () => void;
	onMissing: () => void;
	onOpen: () => void;
	onRemoveFromList: () => void;
	onReveal: () => void;
};

function directionLabel(direction: FilesPageItem["direction"]) {
	return direction === "send" ? "ส่งแล้ว" : "รับแล้ว";
}

function statusLabel(file: FilesPageItem) {
	if (file.status === "failed") return "ล้มเหลว";
	if (file.availability === "missing") return "ไม่พบไฟล์";
	if (file.availability === "unknown") return "กำลังตรวจสอบ";
	return "พร้อมเปิด";
}

export const FileRow = memo(function FileRow({
	file,
	onInspect,
	onMissing,
	onOpen,
	onRemoveFromList,
	onReveal,
	selected,
}: FileRowProps) {
	const fileKind = getFileKind(file.fileName);
	const FileIcon = getReceivedFileIcon(fileKind);
	const unavailable = file.availability === "missing";

	function handlePrimaryAction() {
		if (unavailable) {
			onMissing();
			return;
		}
		onOpen();
	}

	return (
		<div
			role="button"
			tabIndex={0}
			onClick={handlePrimaryAction}
			onKeyDown={(event) => {
				if (event.key === "Enter" || event.key === " ") {
					event.preventDefault();
					handlePrimaryAction();
				}
			}}
			className={cn(
				"flex w-full cursor-pointer items-center gap-3 border-b px-4 py-3 text-left transition-colors hover:bg-muted/30",
				selected && "bg-muted/70 hover:bg-muted/70",
			)}
		>
			<div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent">
				<FileIcon className="size-5 text-muted-foreground" />
			</div>

			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-2">
					<span className="truncate text-sm font-medium text-foreground">{file.fileName}</span>
					<span
						className={cn(
							"shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
							file.status === "failed"
								? "bg-destructive/10 text-destructive"
								: unavailable
									? "bg-muted text-muted-foreground"
									: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
						)}
					>
						{statusLabel(file)}
					</span>
				</div>

				<div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
					<span>{directionLabel(file.direction)}</span>
					{file.peerName ? (
						<>
							<span>·</span>
							<span className="max-w-36 truncate">{file.peerName}</span>
						</>
					) : null}
					<span>·</span>
					<span>{formatFileSize(file.size)}</span>
					<span>·</span>
					<span>{formatRelativeTime(file.updatedAt)}</span>
				</div>
			</div>

			<div className="flex shrink-0 items-center gap-1">
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="h-8 rounded-full text-xs"
					onClick={(event) => {
						event.stopPropagation();
						handlePrimaryAction();
					}}
				>
					<LuExternalLink className="size-3.5" />
					เปิด
				</Button>

				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="size-8 rounded-full text-muted-foreground"
					aria-label={`แสดงใน Explorer ${file.fileName}`}
					onClick={(event) => {
						event.stopPropagation();
						if (unavailable) {
							onMissing();
						} else {
							onReveal();
						}
					}}
				>
					<LuFolderOpen />
				</Button>

				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="size-8 rounded-full text-muted-foreground"
					aria-label={`รายละเอียด ${file.fileName}`}
					onClick={(event) => {
						event.stopPropagation();
						onInspect();
					}}
				>
					<LuEye />
				</Button>

				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="size-8 rounded-full text-destructive hover:text-destructive"
					aria-label={`ลบออกจากรายการ ${file.fileName}`}
					onClick={(event) => {
						event.stopPropagation();
						onRemoveFromList();
					}}
				>
					<LuTrash />
				</Button>
			</div>
		</div>
	);
});

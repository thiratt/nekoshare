import { memo } from "react";

import { LuEllipsis, LuExternalLink } from "react-icons/lu";

import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";

import { getReceivedFileIcon } from "../utils/file-utils";
import type { ReceivedFile } from "../types";

type FileRowProps = {
	file: ReceivedFile;
	selected: boolean;
	onSelect: () => void;
};

export const FileRow = memo(function FileRow({ file, onSelect, selected }: FileRowProps) {
	const FileIcon = getReceivedFileIcon(file.type);

	return (
		<div
			role="button"
			tabIndex={0}
			onClick={onSelect}
			onKeyDown={(event) => {
				if (event.key === "Enter" || event.key === " ") {
					event.preventDefault();
					onSelect();
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
					<span className="truncate text-sm font-medium text-foreground">{file.name}</span>
				</div>

				<div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
					<span>จาก {file.source}</span>
					<span>·</span>
					<span>{file.size}</span>
					<span>·</span>
					<span>{file.receivedAt}</span>
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
					aria-label={`ตัวเลือกเพิ่มเติม ${file.name}`}
					onClick={(event) => {
						event.stopPropagation();
					}}
				>
					<LuEllipsis />
				</Button>
			</div>
		</div>
	);
});

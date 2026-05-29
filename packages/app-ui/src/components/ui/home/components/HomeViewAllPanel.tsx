import { LuEye, LuFile, LuTrash2, LuX } from "react-icons/lu";

import { Button } from "@workspace/ui/components/button";
import { ScrollArea } from "@workspace/ui/components/scroll-area";

import { formatFileSize, getFileExtension, getFileIcon } from "../../drop-overlay";
import { isHomePreviewableFile } from "../utils/file-utils";
import type { HomeDraftFile } from "../types";

export type HomeViewAllMode = "files";

type HomeViewAllPanelProps = {
	files: HomeDraftFile[];
	onClose: () => void;
	onPreviewImage: (file: HomeDraftFile) => void;
	onRemoveFile: (id: string) => void;
};

export function HomeViewAllPanel({ files, onClose, onPreviewImage, onRemoveFile }: HomeViewAllPanelProps) {
	const totalSize = files.reduce((sum, file) => sum + file.size, 0);

	return (
		<aside className="flex h-full shrink-0 flex-col border-l bg-card">
			<div className="flex shrink-0 items-start justify-between gap-3 border-b px-4 py-4">
				<div className="min-w-0">
					<h2 className="truncate text-lg font-semibold">ไฟล์ที่เลือก</h2>
					<p className="truncate text-sm text-muted-foreground">
						{files.length} ไฟล์ · {formatFileSize(totalSize) || "ไม่ทราบขนาด"}
					</p>
				</div>

				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="size-8 shrink-0 rounded-full"
					onClick={onClose}
					title="ปิด"
				>
					<LuX className="size-4" />
				</Button>
			</div>

			<ScrollArea className="min-h-0 flex-1">
				{files.length > 0 ? (
					files.map((file) => (
						<SelectedFileRow
							key={file.id}
							file={file}
							onPreviewImage={onPreviewImage}
							onRemove={() => onRemoveFile(file.id)}
						/>
					))
				) : (
					<div className="p-3">
						<div className="flex h-full min-h-40 items-center justify-center rounded-xl border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
							ยังไม่มีไฟล์ที่เลือก
						</div>
					</div>
				)}
			</ScrollArea>
		</aside>
	);
}

function SelectedFileRow({
	file,
	onPreviewImage,
	onRemove,
}: {
	file: HomeDraftFile;
	onPreviewImage: (file: HomeDraftFile) => void;
	onRemove: () => void;
}) {
	const extension = getFileExtension(file.name);
	const Icon = extension ? getFileIcon(extension) : LuFile;
	const canPreview = isHomePreviewableFile(file);

	return (
		<div className="group flex items-center gap-3 border-b px-4 py-3 transition-colors hover:bg-muted/40">
			<button
				type="button"
				className="relative flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-muted text-muted-foreground"
				aria-label={`ดู ${file.name}`}
				disabled={!canPreview}
				onClick={() => {
					if (canPreview) {
						onPreviewImage(file);
					}
				}}
			>
				<Icon className="size-5 transition-opacity group-hover:opacity-0" />
				<LuEye className="absolute size-5 opacity-0 transition-opacity group-hover:opacity-100" />
			</button>

			<div className="w-0 min-w-0 flex-1">
				<p className="truncate text-sm font-medium text-foreground" title={file.name}>
					{file.name}
				</p>
				<p className="mt-0.5 truncate text-xs text-muted-foreground">
					{formatFileSize(file.size) || "ไม่ทราบขนาด"}
				</p>
			</div>

			<Button
				type="button"
				variant="ghost"
				size="icon"
				className="size-8 shrink-0 rounded-full text-muted-foreground opacity-60 transition hover:text-destructive group-hover:opacity-100"
				onClick={onRemove}
				title="ลบไฟล์นี้"
			>
				<LuTrash2 className="size-4" />
			</Button>
		</div>
	);
}

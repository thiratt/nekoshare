import { LuEye, LuFile, LuX } from "react-icons/lu";

import { Button } from "@workspace/ui/components/button";
import { ScrollArea, ScrollBar } from "@workspace/ui/components/scroll-area";

import { formatFileSize, getFileExtension, getFileIcon } from "../../drop-overlay";
import { isHomePreviewableFile } from "../utils/file-utils";
import type { HomeDraftFile } from "../types";

type HomeSelectedFilesStripProps = {
	files: HomeDraftFile[];
	isViewingAll: boolean;
	totalSize: number;
	onPreviewImage: (file: HomeDraftFile) => void;
	onRemove: (id: string) => void;
	onViewAll: () => void;
};

export function HomeSelectedFilesStrip({
	files,
	isViewingAll,
	onPreviewImage,
	onRemove,
	onViewAll,
	totalSize,
}: HomeSelectedFilesStripProps) {
	const visibleFiles = files.slice(0, 8);
	const hiddenCount = Math.max(0, files.length - visibleFiles.length);

	return (
		<div className="space-y-3">
			<div className="flex items-end justify-between gap-4">
				<div className="text-sm">
					<p className="font-medium text-foreground">เลือกแล้ว {files.length} ไฟล์</p>
					<p className="text-muted-foreground">ขนาดรวม {formatFileSize(totalSize) || "ไม่ทราบขนาด"}</p>
				</div>

				<Button type="button" variant="ghost" size="sm" className="rounded-full" onClick={onViewAll}>
					{isViewingAll ? "ซ่อน" : "ดูทั้งหมด"}
				</Button>
			</div>

			<div className="-mx-4 overflow-hidden">
				<ScrollArea className="w-full">
					<div className="flex w-max pb-3">
						<div className="w-4 shrink-0" />

						<div className="flex gap-2.5">
							{visibleFiles.map((file) => (
								<HomeDraftFileTile
									key={file.id}
									file={file}
									onPreviewImage={onPreviewImage}
									onRemove={onRemove}
								/>
							))}

							{hiddenCount > 0 ? (
								<button
									type="button"
									className="flex h-[72px] w-[150px] shrink-0 items-center justify-center rounded-2xl border bg-muted/60 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
									onClick={onViewAll}
								>
									{isViewingAll ? "ซ่อน" : `+ อีก ${hiddenCount} ไฟล์`}
								</button>
							) : null}
						</div>

						<div className="w-4 shrink-0" />
					</div>

					<ScrollBar orientation="horizontal" className="px-4" />
				</ScrollArea>
			</div>
		</div>
	);
}

function HomeDraftFileTile({
	file,
	onPreviewImage,
	onRemove,
}: {
	file: HomeDraftFile;
	onPreviewImage: (file: HomeDraftFile) => void;
	onRemove: (id: string) => void;
}) {
	const extension = getFileExtension(file.name);
	const Icon = extension ? getFileIcon(extension) : LuFile;
	const canPreview = isHomePreviewableFile(file);

	return (
		<div className="group relative flex h-[72px] w-[190px] shrink-0 items-center gap-3 rounded-2xl border bg-background px-3 py-2 text-left shadow-sm transition-colors hover:bg-muted/40">
			<button
				type="button"
				className="relative flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-primary/10 text-primary"
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

			<div className="min-w-0 flex-1">
				<p className="truncate text-sm font-medium text-foreground">{file.name}</p>
				<p className="mt-0.5 truncate text-xs text-muted-foreground">
					{formatFileSize(file.size) || "ไม่ทราบขนาด"}
				</p>
			</div>

			<button
				type="button"
				className="absolute right-2 top-2 flex size-6 scale-0 items-center justify-center rounded-full bg-destructive text-background opacity-0 transition group-hover:scale-100 group-hover:opacity-100 dark:text-foreground"
				onClick={(event) => {
					event.stopPropagation();
					onRemove(file.id);
				}}
				aria-label={`ลบ ${file.name}`}
			>
				<LuX />
			</button>
		</div>
	);
}

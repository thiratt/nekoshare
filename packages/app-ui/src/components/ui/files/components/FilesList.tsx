import { FileRow } from "./FileRow";
import { FilesEmptyState } from "./FilesEmptyState";
import type { FilesPageAction, FilesPageItem } from "../types";

type FilesListProps = {
	files: FilesPageItem[];
	selectedFileId: string | null;
	onInspectFile: (id: string) => void;
	onMissingFile: FilesPageAction;
	onOpenFile: FilesPageAction;
	onRemoveFromList: FilesPageAction;
	onRevealFile: FilesPageAction;
};

export function FilesList({
	files,
	onInspectFile,
	onMissingFile,
	onOpenFile,
	onRemoveFromList,
	onRevealFile,
	selectedFileId,
}: FilesListProps) {
	return (
		<section className="min-w-0 flex-1 overflow-hidden rounded-2xl border bg-card shadow-sm">
			<div className="border-b px-4 py-3">
				<h2 className="text-sm font-medium text-foreground">ล่าสุด</h2>
			</div>

			{files.length > 0 ? (
				files.map((file) => (
					<FileRow
						key={file.id}
						file={file}
						selected={selectedFileId === file.id}
						onInspect={() => onInspectFile(file.id)}
						onMissing={() => onMissingFile(file)}
						onOpen={() => onOpenFile(file)}
						onRemoveFromList={() => onRemoveFromList(file)}
						onReveal={() => onRevealFile(file)}
					/>
				))
			) : (
				<FilesEmptyState />
			)}
		</section>
	);
}

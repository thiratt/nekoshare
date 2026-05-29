import { FileRow } from "./FileRow";
import { FilesEmptyState } from "./FilesEmptyState";
import type { ReceivedFile } from "../types";

type FilesListProps = {
	files: ReceivedFile[];
	selectedFileId: string | null;
	onSelectFile: (id: string) => void;
};

export function FilesList({ files, onSelectFile, selectedFileId }: FilesListProps) {
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
						onSelect={() => onSelectFile(file.id)}
					/>
				))
			) : (
				<FilesEmptyState />
			)}
		</section>
	);
}

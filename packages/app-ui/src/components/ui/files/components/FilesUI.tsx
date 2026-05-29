import { mockReceivedFiles } from "../constants";
import { useReceivedFiles } from "../hooks/useReceivedFiles";
import { FileInspectorPanel } from "./FileInspectorPanel";
import { FilesHeader } from "./FilesHeader";
import { FilesList } from "./FilesList";
import { FilesToolbar } from "./FilesToolbar";
import type { ReceivedFile } from "../types";

export function ReceivedFilesUI({ files = mockReceivedFiles }: { files?: ReceivedFile[] }) {
	const {
		clearSearch,
		closeInspector,
		filteredFiles,
		searchQuery,
		selectedFile,
		selectedFileId,
		setSearchQuery,
		setSelectedFileId,
	} = useReceivedFiles(files);

	return (
		<div className="flex min-h-full flex-col">
			<FilesHeader />

			<FilesToolbar searchQuery={searchQuery} onSearchQuery={setSearchQuery} onClearSearch={clearSearch} />

			<div className="flex min-h-0 flex-1 overflow-hidden">
				<FilesList files={filteredFiles} selectedFileId={selectedFileId} onSelectFile={setSelectedFileId} />
				<FileInspectorPanel file={selectedFile} onClose={closeInspector} />
			</div>
		</div>
	);
}

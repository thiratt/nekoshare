import { useMemo, useState } from "react";

import { matchReceivedFileSearch } from "../utils/file-utils";
import type { FilesPageItem } from "../types";

export function useReceivedFiles(files: FilesPageItem[]) {
	const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
	const [searchQuery, setSearchQuery] = useState("");

	const selectedFile = useMemo(() => {
		if (!selectedFileId) return null;
		return files.find((file) => file.id === selectedFileId) ?? null;
	}, [files, selectedFileId]);

	const filteredFiles = useMemo(
		() => files.filter((file) => matchReceivedFileSearch(file, searchQuery)),
		[files, searchQuery],
	);

	function clearSearch() {
		setSearchQuery("");
	}

	function closeInspector() {
		setSelectedFileId(null);
	}

	return {
		clearSearch,
		closeInspector,
		filteredFiles,
		searchQuery,
		selectedFile,
		selectedFileId,
		setSearchQuery,
		setSelectedFileId,
	};
}

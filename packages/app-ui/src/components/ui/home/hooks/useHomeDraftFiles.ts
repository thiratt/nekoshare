import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { revokeObjectUrl } from "../preview/preview-utils";
import { createHomeDraftFile, createHomeDraftFileFromPath } from "../utils/file-utils";
import type { HomeDraftFile, HomeDroppedPath } from "../types";

type UseHomeFilesOptions = {
	onRemoveFile?: (id: string) => void;
};

export function useHomeDraftFiles({ onRemoveFile }: UseHomeFilesOptions = {}) {
	const filesRef = useRef<HomeDraftFile[]>([]);
	const [files, setFiles] = useState<HomeDraftFile[]>([]);

	const addFilesToStage = useCallback((incomingFiles: File[]) => {
		if (incomingFiles.length === 0) return;
		setFiles((current) => [...incomingFiles.map(createHomeDraftFile), ...current]);
	}, []);

	const addPathEntriesToStage = useCallback((entries: HomeDroppedPath[]) => {
		if (entries.length === 0) return;
		setFiles((current) => [...entries.map(createHomeDraftFileFromPath), ...current]);
	}, []);

	const removeFile = useCallback(
		(id: string) => {
			setFiles((current) => {
				const removedFile = current.find((file) => file.id === id);
				revokeObjectUrl(removedFile?.previewUrl);
				return current.filter((file) => file.id !== id);
			});

			onRemoveFile?.(id);
		},
		[onRemoveFile],
	);

	const clearFiles = useCallback(() => {
		setFiles((current) => {
			for (const file of current) {
				revokeObjectUrl(file.previewUrl);
				onRemoveFile?.(file.id);
			}

			return [];
		});
	}, [onRemoveFile]);

	const totalSelectedSize = useMemo(() => files.reduce((sum, file) => sum + file.size, 0), [files]);

	useEffect(() => {
		filesRef.current = files;
	}, [files]);

	useEffect(
		() => () => {
			for (const file of filesRef.current) {
				revokeObjectUrl(file.previewUrl);
			}
		},
		[],
	);

	return {
		files,
		addFilesToStage,
		addPathEntriesToStage,
		clearFiles,
		removeFile,
		selectedFileCount: files.length,
		totalSelectedSize,
	};
}

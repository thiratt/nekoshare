import { type DragEvent, useCallback, useRef, useState } from "react";

import { getFilesFromTransfer, isFileDrag } from "../utils/drag-utils";

type UseHomeDragOptions = {
	addFilesToStage: (files: File[]) => void;
};

export function useHomeDragDrop({ addFilesToStage }: UseHomeDragOptions) {
	const dragDepthRef = useRef(0);
	const [isBrowserDraggingInApp, setIsBrowserDraggingInApp] = useState(false);
	const [isBrowserDraggingOverStage, setIsBrowserDraggingOverStage] = useState(false);

	const resetBrowserDrag = useCallback(() => {
		dragDepthRef.current = 0;
		setIsBrowserDraggingInApp(false);
		setIsBrowserDraggingOverStage(false);
	}, []);

	function handleAppDragEnter(event: DragEvent<HTMLDivElement>) {
		if (!isFileDrag(event.dataTransfer)) return;
		event.preventDefault();
		dragDepthRef.current += 1;
		setIsBrowserDraggingInApp(true);
	}

	function handleAppDragLeave(event: DragEvent<HTMLDivElement>) {
		event.preventDefault();
		dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);

		if (dragDepthRef.current === 0) {
			resetBrowserDrag();
		}
	}

	function handleAppDragOver(event: DragEvent<HTMLDivElement>) {
		if (!isFileDrag(event.dataTransfer)) return;
		event.preventDefault();
		event.dataTransfer.dropEffect = "copy";
	}

	function handleAppDrop(event: DragEvent<HTMLDivElement>) {
		if (!isFileDrag(event.dataTransfer)) return;
		event.preventDefault();
		resetBrowserDrag();
	}

	function handleStageDragEnter(event: DragEvent<HTMLElement>) {
		if (!isFileDrag(event.dataTransfer)) return;
		event.preventDefault();
		setIsBrowserDraggingOverStage(true);
	}

	function handleStageDragOver(event: DragEvent<HTMLElement>) {
		if (!isFileDrag(event.dataTransfer)) return;
		event.preventDefault();
		event.dataTransfer.dropEffect = "copy";
	}

	function handleStageDragLeave(event: DragEvent<HTMLElement>) {
		if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
		setIsBrowserDraggingOverStage(false);
	}

	function handleStageDrop(event: DragEvent<HTMLElement>) {
		if (!isFileDrag(event.dataTransfer)) return;
		event.preventDefault();
		addFilesToStage(getFilesFromTransfer(event.dataTransfer));
		resetBrowserDrag();
	}

	return {
		isBrowserDraggingInApp,
		isBrowserDraggingOverStage,
		handleAppDragEnter,
		handleAppDragLeave,
		handleAppDragOver,
		handleAppDrop,
		handleStageDragEnter,
		handleStageDragOver,
		handleStageDragLeave,
		handleStageDrop,
	};
}

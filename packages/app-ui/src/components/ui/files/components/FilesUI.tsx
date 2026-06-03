import { useState } from "react";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import { ScrollArea } from "@workspace/ui/components/scroll-area";

import { DetailPanel, DetailPanelContent, DetailPanelProvider } from "@workspace/app-ui/components/detail-panel";

import { useReceivedFiles } from "../hooks/useReceivedFiles";
import { FileInspector } from "./FileInspector";
import { FileRow } from "./FileRow";
import { FilesEmptyState } from "./FilesEmptyState";
import { FilesHeader } from "./FilesHeader";
import { FilesToolbar } from "./FilesToolbar";
import type { FilesPageAction, FilesPageItem } from "../types";

type ReceivedFilesUIProps = {
	error?: string | null;
	files: FilesPageItem[];
	isLoading?: boolean;
	onMissingFile?: FilesPageAction;
	onOpenFile: FilesPageAction;
	onRefresh: () => void;
	onRemoveFromDevice: FilesPageAction;
	onRemoveFromList: FilesPageAction;
	onRevealFile: FilesPageAction;
};

export function ReceivedFilesUI({
	error,
	files,
	isLoading = false,
	onMissingFile,
	onOpenFile,
	onRefresh,
	onRemoveFromDevice,
	onRemoveFromList,
	onRevealFile,
}: ReceivedFilesUIProps) {
	const [missingFile, setMissingFile] = useState<FilesPageItem | null>(null);
	const [deleteFile, setDeleteFile] = useState<FilesPageItem | null>(null);
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

	function showMissingFileDialog(item: FilesPageItem) {
		onMissingFile?.(item);
		setMissingFile(item);
	}

	async function openFile(item: FilesPageItem) {
		try {
			await onOpenFile(item);
		} catch {
			showMissingFileDialog(item);
		}
	}

	async function revealFile(item: FilesPageItem) {
		try {
			await onRevealFile(item);
		} catch {
			showMissingFileDialog(item);
		}
	}

	async function removeMissingFileFromList() {
		if (!missingFile) return;
		await onRemoveFromList(missingFile);
		setMissingFile(null);
	}

	async function removeSelectedFromList() {
		if (!deleteFile) return;
		await onRemoveFromList(deleteFile);
		setDeleteFile(null);
	}

	async function removeSelectedFromDevice() {
		if (!deleteFile) return;

		const target = deleteFile;
		try {
			await onRemoveFromDevice(target);
			setDeleteFile(null);
		} catch {
			setDeleteFile(null);
			showMissingFileDialog(target);
		}
	}

	return (
		<div className="flex min-h-full flex-col">
			<FilesHeader isLoading={isLoading} onRefresh={onRefresh} />

			<FilesToolbar searchQuery={searchQuery} onSearchQuery={setSearchQuery} onClearSearch={clearSearch} />

			{error ? (
				<p className="mb-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
			) : null}

			<DetailPanelProvider open={selectedFile !== null} width={320} gap={16}>
				<DetailPanel className="rounded-2xl border bg-card shadow-sm">
					<div className="border-b px-4 py-3">
						<h2 className="text-sm font-medium text-foreground">ล่าสุด</h2>
					</div>

					{filteredFiles.length > 0 ? (
						<ScrollArea className="min-h-0 flex-1">
							<div className="min-w-0">
								{filteredFiles.map((file) => (
									<FileRow
										key={file.id}
										file={file}
										selected={selectedFileId === file.id}
										onInspect={() => setSelectedFileId(file.id)}
										onMissing={() => showMissingFileDialog(file)}
										onOpen={() => openFile(file)}
										onRemoveFromList={() => setDeleteFile(file)}
										onReveal={() => revealFile(file)}
									/>
								))}
							</div>
						</ScrollArea>
					) : (
						<FilesEmptyState />
					)}
				</DetailPanel>
				<DetailPanelContent className="rounded-2xl border bg-card shadow-sm overflow-hidden">
					{selectedFile && (
						<FileInspector
							file={selectedFile}
							onClose={closeInspector}
							onMissingFile={showMissingFileDialog}
							onOpenFile={openFile}
							onRemoveFromList={setDeleteFile}
							onRevealFile={revealFile}
						/>
					)}
				</DetailPanelContent>
			</DetailPanelProvider>

			<AlertDialog open={missingFile !== null} onOpenChange={(open) => !open && setMissingFile(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>ไม่พบไฟล์นี้ในเครื่อง</AlertDialogTitle>
						<AlertDialogDescription>
							ไฟล์อาจถูกลบ ย้ายตำแหน่ง หรืออยู่ในไดรฟ์ที่ไม่ได้เชื่อมต่ออยู่
							การลบออกจากรายการจะลบเฉพาะประวัติใน Neko Share ไม่ส่งผลต่อไฟล์ในเครื่องของคุณ
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>ยกเลิก</AlertDialogCancel>
						<AlertDialogAction variant="destructive" onClick={removeMissingFileFromList}>
							ลบออกจากรายการ
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<AlertDialog open={deleteFile !== null} onOpenChange={(open) => !open && setDeleteFile(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>ต้องการลบไฟล์นี้หรือไม่</AlertDialogTitle>
						<AlertDialogDescription>
							คุณกำลังจะลบ <span className="font-medium">{deleteFile?.fileName}</span>
							ออกจากรายการไฟล์ที่ได้รับแล้ว หากเลือก &quot;ลบรายการและไฟล์ในเครื่อง&quot;
							ไฟล์จะถูกลบออกจากเครื่องของคุณด้วย
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter className="sm:flex-col">
						<AlertDialogCancel>ยกเลิก</AlertDialogCancel>
						<AlertDialogAction variant="outline" onClick={removeSelectedFromList}>
							ลบเฉพาะรายการ
						</AlertDialogAction>
						<AlertDialogAction
							variant="destructive"
							disabled={deleteFile?.availability === "missing"}
							onClick={removeSelectedFromDevice}
						>
							ลบรายการและไฟล์ในเครื่อง
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}

import { type ChangeEvent, forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

import {
	DetailPanel,
	DetailPanelContent,
	DetailPanelProvider,
} from "@workspace/app-ui/components/detail-panel";

import { useHomeDraftFiles } from "../hooks/useHomeDraftFiles";
import { useHomeDragDrop } from "../hooks/useHomeDragDrop";
import { useHomePreview } from "../hooks/useHomePreview";
import { useHomeTargets } from "../hooks/useHomeTargets";
import { HomePreviewDialogs } from "../preview/HomePreviewDialogs";
import { HomeActivityArea } from "./HomeActivityArea";
import { HOME_FILE_STAGE_DROP_ID, HomeDropTarget } from "./HomeDropTarget";
import { type HomeViewAllMode, HomeViewAllPanel } from "./HomeViewAllPanel";
import type { HomeDropHandle, HomeUIProps } from "../types";

export const HomeUI = forwardRef<HomeDropHandle, HomeUIProps>(function HomeUI(
	{
		activeTransfers,
		devices,
		dropState,
		friends,
		isLoadingRecentTransfers,
		onResolveAudioPreview,
		onResolveImagePreview,
		onResolvePdfPreview,
		onResolveTextPreview,
		onResolveVideoPreview,
		onSend,
		onViewAllRecentTransfers,
		recentTransfers,
	},
	ref,
) {
	const inputRef = useRef<HTMLInputElement | null>(null);
	const [isSending, setIsSending] = useState(false);
	const [viewAllMode, setViewAllMode] = useState<HomeViewAllMode | null>(null);
	const preview = useHomePreview({
		onResolveAudioPreview,
		onResolveImagePreview,
		onResolvePdfPreview,
		onResolveTextPreview,
		onResolveVideoPreview,
	});
	const { addFilesToStage, addPathEntriesToStage, clearFiles, files, removeFile, selectedFileCount, totalSelectedSize } =
		useHomeDraftFiles({
			onRemoveFile: preview.clearPreviewForFile,
		});
	const targets = useHomeTargets({ selectedFileCount });
	const drag = useHomeDragDrop({ addFilesToStage });

	useImperativeHandle(ref, () => ({ addDroppedPaths: addPathEntriesToStage }), [addPathEntriesToStage]);

	useEffect(() => {
		if (files.length === 0 && viewAllMode === "files") {
			setViewAllMode(null);
		}
	}, [files.length, viewAllMode]);

	function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
		addFilesToStage(Array.from(event.target.files ?? []));
		event.target.value = "";
	}

	function toggleViewAllMode(mode: HomeViewAllMode) {
		setViewAllMode((current) => (current === mode ? null : mode));
	}

	async function handleSend() {
		if (isSending || !onSend || !targets.sendReady || files.length === 0) return;

		setIsSending(true);
		try {
			await onSend?.({
				files,
				selectedTargetIds: targets.selectedTargetIds,
				encrypted: targets.encrypted,
				publicShare: targets.publicShare,
			});
			clearFiles();
		} finally {
			setIsSending(false);
		}
	}

	const isDraggingInApp = drag.isBrowserDraggingInApp || (dropState?.isDragging ?? false);
	const isStageDropActive = drag.isBrowserDraggingOverStage || dropState?.activeDropId === HOME_FILE_STAGE_DROP_ID;

	return (
		<>
			<DetailPanelProvider className="-m-4" open={viewAllMode !== null} width={360} gap={0}>
				<DetailPanel
					className="flex h-full min-w-0 flex-1 flex-col items-center justify-center"
					onDragEnter={drag.handleAppDragEnter}
					onDragLeave={drag.handleAppDragLeave}
					onDragOver={drag.handleAppDragOver}
					onDrop={drag.handleAppDrop}
				>
					<input ref={inputRef} type="file" multiple className="hidden" onChange={handleInputChange} />

					<div className="flex w-full max-w-2xl flex-col items-center">
						<div className="mb-4 flex flex-col items-center gap-1">
							<h1 className="text-2xl font-semibold tracking-tight text-foreground">Neko Share</h1>
						</div>

						<HomeDropTarget
							files={files}
							isViewingAllFiles={viewAllMode === "files"}
							totalSelectedSize={totalSelectedSize}
							isDraggingInApp={isDraggingInApp}
							isStageDropActive={isStageDropActive}
							encrypted={targets.encrypted}
							publicShare={targets.publicShare}
							sendReady={targets.sendReady && Boolean(onSend)}
							isSending={isSending}
							onEncryptedChange={targets.setEncrypted}
							onPublicShareChange={targets.setPublicShareMode}
							onBrowse={() => inputRef.current?.click()}
							onSend={() => void handleSend()}
							onPreviewImage={preview.openPreview}
							onRemoveFile={removeFile}
							onViewAllFiles={() => toggleViewAllMode("files")}
							onDragEnter={drag.handleStageDragEnter}
							onDragOver={drag.handleStageDragOver}
							onDragLeave={drag.handleStageDragLeave}
							onDrop={drag.handleStageDrop}
						/>

						<HomeActivityArea
							activeTransfers={activeTransfers ?? []}
							devices={devices ?? []}
							friends={friends ?? []}
							hasSelectedFiles={files.length > 0}
							isLoadingRecentTransfers={isLoadingRecentTransfers ?? false}
							publicShare={targets.publicShare}
							recentTransfers={recentTransfers ?? []}
							selectedTargetIds={targets.selectedTargetIds}
							onToggleTarget={targets.toggleTarget}
							onViewAllRecentTransfers={onViewAllRecentTransfers}
						/>
					</div>
				</DetailPanel>

				<DetailPanelContent className="h-full">
					<HomeViewAllPanel
						files={files}
						onClose={() => setViewAllMode(null)}
						onPreviewImage={preview.openPreview}
						onRemoveFile={removeFile}
					/>
				</DetailPanelContent>
			</DetailPanelProvider>

			<HomePreviewDialogs
				audio={preview.previewAudio}
				image={preview.previewImage}
				pdf={preview.previewPdf}
				text={preview.previewText}
				video={preview.previewVideo}
				onCloseAudio={preview.closeAudioPreview}
				onCloseImage={preview.closeImagePreview}
				onClosePdf={preview.closePdfPreview}
				onCloseText={preview.closeTextPreview}
				onCloseVideo={preview.closeVideoPreview}
			/>
		</>
	);
});

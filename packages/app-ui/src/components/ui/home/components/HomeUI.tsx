import { type ChangeEvent, forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

import { AnimatePresence, motion } from "motion/react";

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
		devices,
		dropState,
		friends,
		onResolveAudioPreview,
		onResolveImagePreview,
		onResolvePdfPreview,
		onResolveTextPreview,
		onResolveVideoPreview,
	},
	ref,
) {
	const inputRef = useRef<HTMLInputElement | null>(null);
	const [viewAllMode, setViewAllMode] = useState<HomeViewAllMode | null>(null);
	const preview = useHomePreview({
		onResolveAudioPreview,
		onResolveImagePreview,
		onResolvePdfPreview,
		onResolveTextPreview,
		onResolveVideoPreview,
	});
	const { addFilesToStage, addPathEntriesToStage, files, removeFile, selectedFileCount, totalSelectedSize } =
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

	const isDraggingInApp = drag.isBrowserDraggingInApp || (dropState?.isDragging ?? false);
	const isStageDropActive = drag.isBrowserDraggingOverStage || dropState?.activeDropId === HOME_FILE_STAGE_DROP_ID;

	return (
		<div className="-m-4 flex min-h-0 flex-1 overflow-hidden">
			<div
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
						onEncryptedChange={targets.setEncrypted}
						onPublicShareChange={targets.setPublicShareMode}
						onBrowse={() => inputRef.current?.click()}
						onPreviewImage={preview.openPreview}
						onRemoveFile={removeFile}
						onViewAllFiles={() => toggleViewAllMode("files")}
						onDragEnter={drag.handleStageDragEnter}
						onDragOver={drag.handleStageDragOver}
						onDragLeave={drag.handleStageDragLeave}
						onDrop={drag.handleStageDrop}
					/>

					<HomeActivityArea
						devices={devices ?? []}
						friends={friends ?? []}
						hasSelectedFiles={files.length > 0}
						publicShare={targets.publicShare}
						selectedTargetIds={targets.selectedTargetIds}
						onToggleTarget={targets.toggleTarget}
					/>
				</div>
			</div>

			<AnimatePresence initial={false}>
				{viewAllMode ? (
					<motion.div
						key="view-all-shell"
						initial={{ width: 0, opacity: 0 }}
						animate={{ width: 360, opacity: 1 }}
						exit={{ width: 0, opacity: 0 }}
						transition={{
							width: { duration: 0.22, ease: [0.16, 1, 0.3, 1] },
							opacity: { duration: 0.12 },
						}}
						className="h-full shrink-0 overflow-hidden"
					>
						<motion.div
							initial={{ x: 32 }}
							animate={{ x: 0 }}
							exit={{ x: 32 }}
							transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
							className="h-full"
						>
							<HomeViewAllPanel
								files={files}
								onClose={() => setViewAllMode(null)}
								onPreviewImage={preview.openPreview}
								onRemoveFile={removeFile}
							/>
						</motion.div>
					</motion.div>
				) : null}
			</AnimatePresence>

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
		</div>
	);
});

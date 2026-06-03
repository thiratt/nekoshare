import type { DragEventHandler } from "react";

import { AnimatePresence, motion } from "motion/react";
import { LuFolderDown, LuGlobe, LuLoader, LuPaperclip, LuSend, LuShieldCheck } from "react-icons/lu";

import { Button } from "@workspace/ui/components/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";

import { HomeSelectedFilesStrip } from "./HomeSelectedFilesStrip";
import type { HomeDraftFile } from "../types";

export const HOME_FILE_STAGE_DROP_ID = "home-file-stage";

type HomeDropTargetProps = {
	files: HomeDraftFile[];
	isViewingAllFiles: boolean;
	totalSelectedSize: number;
	isDraggingInApp: boolean;
	isStageDropActive: boolean;
	encrypted: boolean;
	isSending: boolean;
	publicShare: boolean;
	sendReady: boolean;
	onEncryptedChange: (encrypted: boolean) => void;
	onPublicShareChange: (publicShare: boolean) => void;
	onBrowse: () => void;
	onPreviewImage: (file: HomeDraftFile) => void;
	onRemoveFile: (id: string) => void;
	onSend: () => void;
	onViewAllFiles: () => void;
	onDragEnter: DragEventHandler<HTMLElement>;
	onDragOver: DragEventHandler<HTMLElement>;
	onDragLeave: DragEventHandler<HTMLElement>;
	onDrop: DragEventHandler<HTMLElement>;
};

export function HomeDropTarget({
	encrypted,
	files,
	isViewingAllFiles,
	isDraggingInApp,
	isSending,
	isStageDropActive,
	onBrowse,
	onDragEnter,
	onDragLeave,
	onDragOver,
	onDrop,
	onEncryptedChange,
	onPreviewImage,
	onPublicShareChange,
	onRemoveFile,
	onSend,
	onViewAllFiles,
	publicShare,
	sendReady,
	totalSelectedSize,
}: HomeDropTargetProps) {
	const showDropCue = isDraggingInApp || isStageDropActive;

	return (
		<div
			className={cn(
				"relative w-full overflow-hidden rounded-2xl border bg-card px-4 py-3 shadow-sm",
				"transition-[border-color,background-color,box-shadow]",
				isStageDropActive && "border-primary bg-primary/5 ring-4 ring-primary/10",
				showDropCue && !isStageDropActive && "border-primary/40",
			)}
			data-drop-id={HOME_FILE_STAGE_DROP_ID}
			data-drop-type="stage"
			onDragEnter={onDragEnter}
			onDragOver={onDragOver}
			onDragLeave={onDragLeave}
			onDrop={onDrop}
		>
			<AnimatePresence initial={false}>
				{showDropCue ? (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className={cn(
							"pointer-events-none absolute inset-0 z-50 flex flex-col items-center justify-center gap-2 text-center backdrop-blur-xs transition-colors",
							isStageDropActive ? "bg-muted/50" : "bg-background/50",
						)}
					>
						<div className="flex size-14 items-center justify-center rounded-full border border-current/30 bg-background/80">
							<LuFolderDown className="size-7" />
						</div>
						<p className="font-medium">{isStageDropActive ? "ปล่อยเพื่อเพิ่มไฟล์" : "วางลงที่นี่"}</p>
					</motion.div>
				) : null}
			</AnimatePresence>

			<div className="flex min-h-34 flex-col justify-between gap-4">
				<div className="flex items-start gap-3 pt-1">
					<div className="min-w-0 flex-1">
						<p className="text-base text-muted-foreground">
							ลากและวางไฟล์ที่นี่หรือเลือกไฟล์เพื่อเริ่มแชร์
						</p>
					</div>
				</div>

				<AnimatePresence initial={false}>
					{files.length > 0 ? (
						<motion.div
							key="file-selection"
							initial={{ height: 0, opacity: 0 }}
							animate={{ height: "auto", opacity: 1 }}
							exit={{ height: 0, opacity: 0 }}
						>
							<div className="pt-1">
								<HomeSelectedFilesStrip
									files={files}
									isViewingAll={isViewingAllFiles}
									totalSize={totalSelectedSize}
									onPreviewImage={onPreviewImage}
									onRemove={onRemoveFile}
									onViewAll={onViewAllFiles}
								/>
							</div>
						</motion.div>
					) : null}
				</AnimatePresence>

				<div className="flex items-center justify-between gap-3">
					<div className="flex flex-wrap items-center gap-2">
						<EncryptionButton
							encrypted={encrypted}
							publicShare={publicShare}
							onEncryptedChange={onEncryptedChange}
						/>

						<Button
							type="button"
							variant="outline"
							size="sm"
							className={cn(
								"rounded-full",
								publicShare &&
									"bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary font-semibold",
							)}
							onClick={() => onPublicShareChange(!publicShare)}
							aria-pressed={publicShare}
						>
							<LuGlobe />
							แชร์ผ่านลิงก์
						</Button>
					</div>

					<div className="flex shrink-0 items-center gap-2">
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="size-10 rounded-full"
									onClick={onBrowse}
								>
									<LuPaperclip />
								</Button>
							</TooltipTrigger>

							<TooltipContent side="bottom" className="max-w-xs">
								<p>เลือกไฟล์</p>
							</TooltipContent>
						</Tooltip>

						<Button
							type="button"
							size="icon"
							className="size-11 rounded-full"
							disabled={!sendReady || isSending}
							onClick={onSend}
							title={isSending ? "กำลังเริ่มส่งไฟล์" : "ส่งไฟล์"}
						>
							{isSending ? <LuLoader className="animate-spin" /> : <LuSend />}
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}

function EncryptionButton({
	encrypted,
	publicShare,
	onEncryptedChange,
}: {
	encrypted: boolean;
	publicShare: boolean;
	onEncryptedChange: (encrypted: boolean) => void;
}) {
	const button = (
		<Button
			type="button"
			variant="outline"
			size="sm"
			className={cn(
				"rounded-full",
				encrypted &&
					!publicShare &&
					"bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary font-semibold",
			)}
			onClick={() => onEncryptedChange(!encrypted)}
			disabled={publicShare}
			aria-pressed={encrypted}
		>
			<LuShieldCheck />
			เข้ารหัสข้อมูล
		</Button>
	);

	if (!publicShare) return button;

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<span className="inline-flex rounded-full">{button}</span>
			</TooltipTrigger>

			<TooltipContent side="bottom" className="max-w-xs">
				<p>ไม่สามารถปิดการเข้ารหัสได้เมื่อแชร์ผ่านลิงก์</p>
			</TooltipContent>
		</Tooltip>
	);
}

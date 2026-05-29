import { useMemo } from "react";

import { AnimatePresence, motion } from "motion/react";
import { LuCopy, LuExternalLink, LuFileText, LuFolderOpen, LuX } from "react-icons/lu";

import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";

import type { HomePreviewPdfItem } from "./preview-types";

const demoPdfUrl = "https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf";

export type HomePreviewPdfDialogProps = {
	show: boolean;
	onClose: () => void;

	pdf?: HomePreviewPdfItem;
	src?: string;
	fileName?: string;
	sizeLabel?: string;
	description?: string;

	placement?: "fixed" | "absolute";
	className?: string;

	onCopy?: () => void;
	onOpenFile?: () => void;
	onOpenFolder?: () => void;
};

function withPdfViewerOptions(src: string) {
	if (!src) return src;

	const hasHash = src.includes("#");
	const separator = hasHash ? "&" : "#";

	// Works in many Chromium/WebView PDF viewers. If ignored, native toolbar still shows.
	return `${src}${separator}toolbar=0&navpanes=0&scrollbar=1&view=FitH`;
}

export function HomePreviewPdfDialog({
	show,
	onClose,
	pdf,
	src = demoPdfUrl,
	fileName = "document.pdf",
	sizeLabel = "2.1 MB",
	description = "ตัวอย่าง PDF ก่อนส่ง ไฟล์นี้ยังอยู่ในรายการที่เลือกและยังไม่ได้ถูกส่งจริง",
	placement = "fixed",
	className,
	onCopy,
	onOpenFile,
	onOpenFolder,
}: HomePreviewPdfDialogProps) {
	const previewSrc = pdf?.src ?? src;
	const previewFileName = pdf?.name ?? fileName;
	const previewSizeLabel = pdf?.sizeLabel ?? sizeLabel;
	const previewDescription = pdf?.description ?? description;
	const viewerSrc = useMemo(() => withPdfViewerOptions(previewSrc), [previewSrc]);

	return (
		<AnimatePresence initial={false}>
			{show ? (
				<motion.div
					role="dialog"
					aria-modal="true"
					aria-label={previewFileName}
					className={cn(
						placement === "fixed" ? "fixed" : "absolute",
						"inset-0 z-50 overflow-hidden bg-[#1e1e1e]",
						className,
					)}
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.16 }}
				>
					<div className="flex h-full min-h-0 flex-col">
						<header className="flex shrink-0 items-center justify-between gap-4 border-b border-[#2d2d30] bg-[#252526] px-4 py-3 text-[#cccccc]">
							<div className="flex min-w-0 items-center gap-3">
								<div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#3c3c3c] text-[#cccccc]">
									<LuFileText className="size-5" />
								</div>

								<div className="min-w-0">
									<h2
										className="truncate text-sm font-semibold text-[#cccccc]"
										title={previewFileName}
									>
										{previewFileName}
									</h2>
									<p className="truncate text-xs text-[#858585]">PDF · {previewSizeLabel}</p>
								</div>
							</div>

							<div className="flex shrink-0 items-center gap-1">
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="size-9 rounded-full text-[#cccccc] hover:bg-[#3c3c3c] hover:text-white"
									onClick={onCopy}
									title="คัดลอก"
								>
									<LuCopy className="size-4" />
								</Button>

								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="size-9 rounded-full text-[#cccccc] hover:bg-[#3c3c3c] hover:text-white"
									onClick={onOpenFile}
									title="เปิดไฟล์"
								>
									<LuExternalLink className="size-4" />
								</Button>

								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="size-9 rounded-full text-[#cccccc] hover:bg-[#3c3c3c] hover:text-white"
									onClick={onOpenFolder}
									title="เปิดในโฟลเดอร์"
								>
									<LuFolderOpen className="size-4" />
								</Button>

								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="size-9 rounded-full text-[#cccccc] hover:bg-[#3c3c3c] hover:text-white"
									onClick={onClose}
									title="ปิด"
								>
									<LuX className="size-5" />
								</Button>
							</div>
						</header>

						<div className="min-h-0 flex-1 bg-[#1e1e1e] p-3">
							<div className="h-full overflow-hidden rounded-xl border border-[#2d2d30] bg-[#111111] shadow-2xl">
								<iframe
									title={previewFileName}
									src={viewerSrc}
									className="h-full w-full border-0 bg-white"
								/>
							</div>
						</div>

						<footer className="flex shrink-0 items-center justify-between gap-4 border-t border-[#2d2d30] bg-[#252526] px-4 py-2.5 text-[#cccccc]">
							<p className="min-w-0 truncate text-xs text-[#858585]">{previewDescription}</p>

							<div className="flex shrink-0 items-center gap-2">
								<Button
									type="button"
									variant="outline"
									size="sm"
									className="rounded-full border-[#3c3c3c] bg-[#2d2d30] text-[#cccccc] hover:bg-[#3c3c3c] hover:text-white"
									onClick={onOpenFolder}
								>
									<LuFolderOpen className="size-4" />
									เปิดในโฟลเดอร์
								</Button>

								<Button
									type="button"
									size="sm"
									className="rounded-full bg-[#6f4e3f] text-white hover:bg-[#7a5949]"
									onClick={onOpenFile}
								>
									<LuExternalLink className="size-4" />
									เปิดไฟล์
								</Button>
							</div>
						</footer>
					</div>
				</motion.div>
			) : null}
		</AnimatePresence>
	);
}

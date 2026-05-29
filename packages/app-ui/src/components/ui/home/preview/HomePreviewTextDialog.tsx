import { useMemo, useState } from "react";

import { AnimatePresence, motion } from "motion/react";
import { LuCopy, LuExternalLink, LuFileText, LuFolderOpen, LuListOrdered, LuText, LuX } from "react-icons/lu";

import { Button } from "@workspace/ui/components/button";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { cn } from "@workspace/ui/lib/utils";

import type { HomePreviewTextItem } from "./preview-types";

const demoText = `import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(app)/home/")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<main>
			<NekoShare />
		</main>
	);
}

function NekoShare() {
	return <div>Drag files here</div>;
}
`;

export type HomePreviewTextDialogProps = {
	show: boolean;
	onClose: () => void;
	text?: HomePreviewTextItem;
	fileName?: string;
	languageLabel?: string;
	sizeLabel?: string;
	content?: string;
};

export function HomePreviewTextDialog({
	show,
	onClose,
	text,
	fileName = "home.tsx",
	languageLabel = "TypeScript React",
	sizeLabel = "2.1 KB",
	content = demoText,
}: HomePreviewTextDialogProps) {
	const [wrapText, setWrapText] = useState(false);
	const [showLineNumbers, setShowLineNumbers] = useState(true);

	const previewFileName = text?.name ?? fileName;
	const previewLanguageLabel = text?.languageLabel ?? languageLabel;
	const previewSizeLabel = text?.sizeLabel ?? sizeLabel;
	const previewContent = text?.content ?? content;
	const lines = useMemo(() => previewContent.split(/\r?\n/), [previewContent]);

	const toolbarButtonClass = "rounded-full text-[#cccccc] hover:bg-[#3c3c3c] hover:text-white";

	const toolbarButtonActiveClass = "bg-[#3c3c3c] text-white hover:bg-[#3c3c3c] hover:text-white";

	return (
		<AnimatePresence initial={false}>
			{show ? (
				<motion.div
					role="dialog"
					aria-modal="true"
					aria-label={previewFileName}
					className="fixed inset-0 z-50 overflow-hidden bg-background"
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
									<p className="truncate text-xs text-[#858585]">
										{previewLanguageLabel} · {previewSizeLabel}
									</p>
								</div>
							</div>
							<div className="flex shrink-0 items-center gap-1">
								<Button
									type="button"
									variant="ghost"
									size="sm"
									className={cn(toolbarButtonClass, showLineNumbers && toolbarButtonActiveClass)}
									onClick={() => setShowLineNumbers((value) => !value)}
								>
									<LuListOrdered className="size-4" />
									บรรทัด
								</Button>

								<Button
									type="button"
									variant="ghost"
									size="sm"
									className={cn(toolbarButtonClass, wrapText && toolbarButtonActiveClass)}
									onClick={() => setWrapText((value) => !value)}
								>
									<LuText className="size-4" />
									ตัดบรรทัด
								</Button>

								<Button
									type="button"
									variant="ghost"
									size="icon"
									className={cn("size-9", toolbarButtonClass)}
									onClick={() => void window.navigator.clipboard.writeText(previewContent)}
								>
									<LuCopy />
								</Button>

								<Button
									type="button"
									variant="ghost"
									size="icon"
									className={cn("size-9", toolbarButtonClass)}
								>
									<LuExternalLink />
								</Button>

								<Button
									type="button"
									variant="ghost"
									size="icon"
									className={cn("size-9", toolbarButtonClass)}
								>
									<LuFolderOpen />
								</Button>

								<Button
									type="button"
									variant="ghost"
									size="icon"
									className={cn("size-9", toolbarButtonClass)}
									onClick={onClose}
								>
									<LuX className="size-5" />
								</Button>
							</div>
						</header>

						<div className="min-h-0 flex-1 bg-[#1e1e1e] text-[#d4d4d4]">
							<ScrollArea className="h-full">
								<pre
									className={cn(
										"min-h-full p-0 font-mono text-[13px] leading-6",
										wrapText ? "whitespace-pre-wrap wrap-break-word" : "whitespace-pre",
									)}
								>
									{lines.map((line, index) => (
										<div
											key={index}
											className="group flex min-w-0 border-b border-[#252526] hover:bg-[#2a2d2e]"
										>
											{showLineNumbers ? (
												<span className="sticky left-0 z-10 w-14 shrink-0 select-none bg-[#1e1e1e] pr-4 text-right text-[#858585] group-hover:bg-[#2a2d2e]">
													{index + 1}
												</span>
											) : null}

											<code className="block min-w-0 px-4 text-[#d4d4d4]">{line || " "}</code>
										</div>
									))}
								</pre>
							</ScrollArea>
						</div>

						<footer className="flex shrink-0 items-center justify-between gap-4 border-t border-[#2d2d30] bg-[#252526] px-4 py-2.5 text-[#cccccc]">
							<p className="text-xs text-[#858585]">
								แสดงตัวอย่างแบบอ่านอย่างเดียว · ยังไม่ได้แก้ไขไฟล์จริง
							</p>

							<div className="flex items-center gap-2">
								<Button
									type="button"
									variant="outline"
									size="sm"
									className="rounded-full border-[#3c3c3c] bg-[#2d2d30] text-[#cccccc] hover:bg-[#3c3c3c] hover:text-white"
								>
									<LuFolderOpen className="size-4" />
									เปิดในโฟลเดอร์
								</Button>

								<Button
									type="button"
									size="sm"
									className="rounded-full bg-[#6f4e3f] text-white hover:bg-[#7a5949]"
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

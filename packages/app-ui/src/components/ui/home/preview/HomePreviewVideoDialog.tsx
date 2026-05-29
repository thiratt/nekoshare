import { useEffect, useMemo, useRef, useState } from "react";

import { AnimatePresence, motion } from "motion/react";
import { LuCopy, LuExternalLink, LuFilm, LuFolderOpen, LuPause, LuPlay, LuVolume2, LuX } from "react-icons/lu";

import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";

import type { HomePreviewVideoItem } from "./preview-types";

const demoVideoUrl = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

export type HomePreviewVideoDialogProps = {
	show: boolean;
	onClose: () => void;

	video?: HomePreviewVideoItem;
	src?: string;
	fileName?: string;
	sizeLabel?: string;
	durationLabel?: string;
	codecLabel?: string;
	description?: string;
	poster?: string;

	placement?: "fixed" | "absolute";
	className?: string;

	onCopy?: () => void;
	onOpenFile?: () => void;
	onOpenFolder?: () => void;
};

export function HomePreviewVideoDialog({
	show,
	onClose,
	video,
	src = demoVideoUrl,
	fileName = "project-demo.mp4",
	sizeLabel = "24.8 MB",
	durationLabel = "00:32",
	codecLabel = "MP4",
	description = "ตัวอย่างวิดีโอก่อนส่ง ไฟล์นี้ยังอยู่ในรายการที่เลือกและยังไม่ได้ถูกส่งจริง",
	poster,
	placement = "fixed",
	className,
	onCopy,
	onOpenFile,
	onOpenFolder,
}: HomePreviewVideoDialogProps) {
	const videoRef = useRef<HTMLVideoElement | null>(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const [canPreview, setCanPreview] = useState(true);
	const previewSrc = video?.src ?? src;
	const previewFileName = video?.name ?? fileName;
	const previewSizeLabel = video?.sizeLabel ?? sizeLabel;
	const previewDurationLabel = video?.durationLabel ?? durationLabel;
	const previewCodecLabel = video?.codecLabel ?? codecLabel;
	const previewDescription = video?.description ?? description;
	const previewPoster = video?.poster ?? poster;

	const metaLabel = useMemo(() => {
		return ["วิดีโอ", previewCodecLabel, previewDurationLabel, previewSizeLabel].filter(Boolean).join(" · ");
	}, [previewCodecLabel, previewDurationLabel, previewSizeLabel]);

	useEffect(() => {
		if (!show) return;

		setIsPlaying(false);
		setCanPreview(true);

		const video = videoRef.current;
		video?.pause();
		if (video) video.currentTime = 0;
	}, [previewSrc, show]);

	useEffect(() => {
		if (!show) return;

		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape") {
				event.preventDefault();
				onClose();
			}
		}

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [onClose, show]);

	useEffect(() => {
		if (!show) return;

		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";

		return () => {
			document.body.style.overflow = previousOverflow;
		};
	}, [show]);

	function handleTogglePlay() {
		const video = videoRef.current;
		if (!video) return;

		if (video.paused) {
			void video.play();
		} else {
			video.pause();
		}
	}

	return (
		<AnimatePresence initial={false}>
			{show ? (
				<motion.div
					role="dialog"
					aria-modal="true"
					aria-label={previewFileName}
					className={cn(
						placement === "fixed" ? "fixed" : "absolute",
						"inset-0 z-50 overflow-hidden bg-black",
						className,
					)}
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.16 }}
				>
					<div className="flex h-full min-h-0 flex-col">
						<header className="flex shrink-0 items-center justify-between gap-4 border-b border-white/10 bg-black/75 px-4 py-3 text-white backdrop-blur-md">
							<div className="flex min-w-0 items-center gap-3">
								<div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white">
									<LuFilm className="size-5" />
								</div>

								<div className="min-w-0">
									<h2 className="truncate text-sm font-semibold text-white" title={previewFileName}>
										{previewFileName}
									</h2>
									<p className="truncate text-xs text-white/60">{metaLabel}</p>
								</div>
							</div>

							<div className="flex shrink-0 items-center gap-1">
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="size-9 rounded-full text-white hover:bg-white/15 hover:text-white"
									onClick={handleTogglePlay}
									title={isPlaying ? "หยุดชั่วคราว" : "เล่น"}
									disabled={!canPreview}
								>
									{isPlaying ? <LuPause className="size-4" /> : <LuPlay className="size-4" />}
								</Button>

								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="size-9 rounded-full text-white hover:bg-white/15 hover:text-white"
									title="เสียง"
									disabled={!canPreview}
								>
									<LuVolume2 className="size-4" />
								</Button>

								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="size-9 rounded-full text-white hover:bg-white/15 hover:text-white"
									onClick={onCopy}
									title="คัดลอก"
								>
									<LuCopy className="size-4" />
								</Button>

								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="size-9 rounded-full text-white hover:bg-white/15 hover:text-white"
									onClick={onOpenFile}
									title="เปิดไฟล์"
								>
									<LuExternalLink className="size-4" />
								</Button>

								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="size-9 rounded-full text-white hover:bg-white/15 hover:text-white"
									onClick={onOpenFolder}
									title="เปิดในโฟลเดอร์"
								>
									<LuFolderOpen className="size-4" />
								</Button>

								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="size-9 rounded-full text-white hover:bg-white/15 hover:text-white"
									onClick={onClose}
									title="ปิด"
								>
									<LuX className="size-5" />
								</Button>
							</div>
						</header>

						<div className="relative min-h-0 flex-1 overflow-hidden bg-black">
							{canPreview ? (
								<video
									ref={videoRef}
									src={previewSrc}
									poster={previewPoster}
									controls
									preload="metadata"
									playsInline
									className="h-full w-full bg-black object-contain"
									onPlay={() => setIsPlaying(true)}
									onPause={() => setIsPlaying(false)}
									onEnded={() => setIsPlaying(false)}
									onError={() => {
										setIsPlaying(false);
										setCanPreview(false);
									}}
								>
									<track kind="captions" />
								</video>
							) : (
								<div className="flex h-full items-center justify-center p-6 text-center">
									<div className="flex max-w-sm flex-col items-center gap-4">
										<div className="flex size-20 items-center justify-center rounded-3xl bg-white/10 text-white/70">
											<LuFilm className="size-10" />
										</div>

										<div>
											<p className="font-medium text-white">ไม่สามารถแสดงตัวอย่างวิดีโอนี้ได้</p>
											<p className="mt-1 text-sm text-white/60">
												ไฟล์อาจใช้ codec ที่ WebView ไม่รองรับ ให้เปิดด้วยแอปในเครื่องแทน
											</p>
										</div>

										<Button
											type="button"
											className="rounded-full bg-white text-black hover:bg-white/90"
											onClick={onOpenFile}
										>
											<LuExternalLink className="size-4" />
											เปิดไฟล์
										</Button>
									</div>
								</div>
							)}
						</div>

						<footer className="flex shrink-0 items-center justify-between gap-4 border-t border-white/10 bg-black/75 px-4 py-2.5 text-white backdrop-blur-md">
							<p className="min-w-0 truncate text-xs text-white/60">{previewDescription}</p>

							<div className="flex shrink-0 items-center gap-2">
								<Button
									type="button"
									variant="outline"
									size="sm"
									className="rounded-full border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
									onClick={onOpenFolder}
								>
									<LuFolderOpen className="size-4" />
									เปิดในโฟลเดอร์
								</Button>

								<Button
									type="button"
									size="sm"
									className="rounded-full bg-white text-black hover:bg-white/90"
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

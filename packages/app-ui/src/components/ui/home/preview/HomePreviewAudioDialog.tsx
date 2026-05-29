import { useEffect, useMemo, useRef, useState } from "react";

import { AnimatePresence, motion } from "motion/react";
import {
	LuCopy,
	LuExternalLink,
	LuFolderOpen,
	LuMusic2,
	LuPause,
	LuPlay,
	LuRotateCcw,
	LuVolume2,
	LuX,
} from "react-icons/lu";

import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";

import type { HomePreviewAudioItem } from "./preview-types";

const demoAudioUrl = "https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3";

export type HomePreviewAudioDialogProps = {
	show: boolean;
	onClose: () => void;

	audio?: HomePreviewAudioItem;
	src?: string;
	fileName?: string;
	sizeLabel?: string;
	durationLabel?: string;
	codecLabel?: string;
	description?: string;

	placement?: "fixed" | "absolute";
	className?: string;

	onCopy?: () => void;
	onOpenFile?: () => void;
	onOpenFolder?: () => void;
};

export function HomePreviewAudioDialog({
	show,
	onClose,
	audio,
	src = demoAudioUrl,
	fileName = "voice-note.mp3",
	sizeLabel = "1.8 MB",
	durationLabel = "00:08",
	codecLabel = "MP3",
	description = "ตัวอย่างเสียงก่อนส่ง ไฟล์นี้ยังอยู่ในรายการที่เลือกและยังไม่ได้ถูกส่งจริง",
	placement = "fixed",
	className,
	onCopy,
	onOpenFile,
	onOpenFolder,
}: HomePreviewAudioDialogProps) {
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const [canPreview, setCanPreview] = useState(true);
	const previewSrc = audio?.src ?? src;
	const previewFileName = audio?.name ?? fileName;
	const previewSizeLabel = audio?.sizeLabel ?? sizeLabel;
	const previewDurationLabel = audio?.durationLabel ?? durationLabel;
	const previewCodecLabel = audio?.codecLabel ?? codecLabel;
	const previewDescription = audio?.description ?? description;

	const metaLabel = useMemo(() => {
		return ["เสียง", previewCodecLabel, previewDurationLabel, previewSizeLabel].filter(Boolean).join(" · ");
	}, [previewCodecLabel, previewDurationLabel, previewSizeLabel]);

	useEffect(() => {
		if (!show) return;

		setIsPlaying(false);
		setCanPreview(true);

		const audio = audioRef.current;
		audio?.pause();

		if (audio) {
			audio.currentTime = 0;
			audio.load();
		}
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
		const audio = audioRef.current;
		if (!audio) return;

		if (audio.paused) {
			void audio.play();
		} else {
			audio.pause();
		}
	}

	function handleRestart() {
		const audio = audioRef.current;
		if (!audio) return;

		audio.currentTime = 0;

		if (isPlaying) {
			void audio.play();
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
						"inset-0 z-50 overflow-hidden bg-[#111111]",
						className,
					)}
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.16 }}
				>
					<div className="flex h-full min-h-0 flex-col">
						<header className="flex shrink-0 items-center justify-between gap-4 border-b border-white/10 bg-black/70 px-4 py-3 text-white backdrop-blur-md">
							<div className="flex min-w-0 items-center gap-3">
								<div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white">
									<LuMusic2 className="size-5" />
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
									onClick={handleRestart}
									title="เริ่มใหม่"
									disabled={!canPreview}
								>
									<LuRotateCcw className="size-4" />
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

						<div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-[#111111] p-6">
							{canPreview ? (
								<div className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/6 p-6 text-white shadow-2xl backdrop-blur-md">
									<div className="flex flex-col items-center text-center">
										<div className="flex size-24 items-center justify-center rounded-3xl bg-white/10 text-white/80 shadow-lg">
											<LuVolume2 className="size-12" />
										</div>

										<h2
											className="mt-5 max-w-full truncate text-xl font-semibold"
											title={previewFileName}
										>
											{previewFileName}
										</h2>

										<p className="mt-1 text-sm text-white/60">{metaLabel}</p>
									</div>

									<div className="mt-6 flex h-16 items-center justify-center gap-1 overflow-hidden rounded-2xl bg-black/20 px-4">
										{Array.from({ length: 42 }).map((_, index) => (
											<div
												key={index}
												className="w-1 rounded-full bg-white/35"
												style={{
													height: `${18 + ((index * 17) % 38)}px`,
													opacity: isPlaying ? 0.75 : 0.35,
												}}
											/>
										))}
									</div>

									<audio
										ref={audioRef}
										src={previewSrc}
										controls
										preload="metadata"
										className="mt-6 w-full"
										onPlay={() => setIsPlaying(true)}
										onPause={() => setIsPlaying(false)}
										onEnded={() => setIsPlaying(false)}
										onError={() => {
											setIsPlaying(false);
											setCanPreview(false);
										}}
									/>

									<p className="mt-4 text-center text-xs text-white/50">
										ใช้ตัวเล่นเสียงของระบบเพื่อให้รองรับได้เสถียรที่สุด
									</p>
								</div>
							) : (
								<div className="flex max-w-sm flex-col items-center gap-4 text-center">
									<div className="flex size-20 items-center justify-center rounded-3xl bg-white/10 text-white/70">
										<LuMusic2 className="size-10" />
									</div>

									<div>
										<p className="font-medium text-white">ไม่สามารถแสดงตัวอย่างเสียงนี้ได้</p>
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
							)}
						</div>

						<footer className="flex shrink-0 items-center justify-between gap-4 border-t border-white/10 bg-black/70 px-4 py-2.5 text-white backdrop-blur-md">
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

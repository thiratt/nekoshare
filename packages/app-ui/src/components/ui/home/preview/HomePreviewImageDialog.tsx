import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type WheelEvent } from "react";

import { AnimatePresence, motion, useMotionValue } from "motion/react";
import {
	LuChevronLeft,
	LuChevronRight,
	LuCopy,
	LuExternalLink,
	LuFolderOpen,
	LuMinus,
	LuPlus,
	LuX,
} from "react-icons/lu";

import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";

import type { HomePreviewImageItem } from "./preview-types";

const DEMO_IMAGE_URL =
	"https://wallpapercat.com/w/full/2/0/9/71103-3840x2160-desktop-4k-red-dead-redemption-wallpaper-image.jpg";

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;
const WHEEL_ZOOM_STEP = 0.15;

type Size = {
	width: number;
	height: number;
};

type DragBounds = {
	left: number;
	right: number;
	top: number;
	bottom: number;
};

export type HomePreviewImageDialogProps = {
	show: boolean;
	image?: HomePreviewImageItem;
	placement?: "fixed" | "absolute";
	className?: string;
	canGoPrevious?: boolean;
	canGoNext?: boolean;
	onClose: () => void;
	onPrevious?: () => void;
	onNext?: () => void;
	onCopy?: (image: HomePreviewImageItem) => void;
	onOpenFile?: (image: HomePreviewImageItem) => void;
	onOpenFolder?: (image: HomePreviewImageItem) => void;
	onToggleFullscreen?: (image: HomePreviewImageItem) => void;
};

const fallbackImage: HomePreviewImageItem = {
	id: "demo",
	src: DEMO_IMAGE_URL,
	name: "red-dead-redemption-wallpaper.jpg",
	typeLabel: "รูปภาพ · 4K Wallpaper",
	sizeLabel: "6.7 MB",
	description: "ตัวอย่างรูปภาพก่อนส่ง ไฟล์นี้ยังอยู่ในรายการที่เลือกและยังไม่ได้ถูกส่งจริง",
};

function clamp(value: number, min: number, max: number) {
	return Math.min(max, Math.max(min, value));
}

function clampZoom(value: number) {
	return clamp(Number(value.toFixed(2)), MIN_ZOOM, MAX_ZOOM);
}

function getContainedSize({
	containerWidth,
	containerHeight,
	imageWidth,
	imageHeight,
}: {
	containerWidth: number;
	containerHeight: number;
	imageWidth: number;
	imageHeight: number;
}) {
	if (containerWidth <= 0 || containerHeight <= 0 || imageWidth <= 0 || imageHeight <= 0) {
		return { width: containerWidth, height: containerHeight };
	}

	const scale = Math.min(containerWidth / imageWidth, containerHeight / imageHeight);

	return {
		width: imageWidth * scale,
		height: imageHeight * scale,
	};
}

function getDragBounds({
	viewportSize,
	naturalSize,
	zoom,
}: {
	viewportSize: Size;
	naturalSize: Size;
	zoom: number;
}): DragBounds {
	const contained = getContainedSize({
		containerWidth: viewportSize.width,
		containerHeight: viewportSize.height,
		imageWidth: naturalSize.width,
		imageHeight: naturalSize.height,
	});

	const maxX = Math.max(0, (contained.width * zoom - viewportSize.width) / 2);
	const maxY = Math.max(0, (contained.height * zoom - viewportSize.height) / 2);

	return {
		left: -maxX,
		right: maxX,
		top: -maxY,
		bottom: maxY,
	};
}

function useElementSize(ref: React.RefObject<HTMLElement | null>, enabled: boolean) {
	const [size, setSize] = useState<Size>({ width: 0, height: 0 });

	useEffect(() => {
		if (!enabled || !ref.current) return;

		const element = ref.current;

		function updateSize() {
			const rect = element.getBoundingClientRect();

			setSize({
				width: rect.width,
				height: rect.height,
			});
		}

		updateSize();

		const observer = new ResizeObserver(updateSize);
		observer.observe(element);

		return () => observer.disconnect();
	}, [enabled, ref]);

	return size;
}

export function HomePreviewImageDialog({
	show,
	image = fallbackImage,
	placement = "fixed",
	className,
	canGoPrevious = true,
	canGoNext = true,
	onClose,
	onPrevious,
	onNext,
	onCopy,
	onOpenFile,
	onOpenFolder,
}: HomePreviewImageDialogProps) {
	const viewportRef = useRef<HTMLDivElement | null>(null);
	const suppressToggleRef = useRef(false);

	const [zoom, setZoom] = useState(1);
	const [controlsVisible, setControlsVisible] = useState(true);
	const [naturalSize, setNaturalSize] = useState<Size>({ width: 0, height: 0 });

	const x = useMotionValue(0);
	const y = useMotionValue(0);

	const viewportSize = useElementSize(viewportRef, show);
	const canPan = zoom > MIN_ZOOM;
	const zoomPercent = Math.round(zoom * 100);

	const imageMeta = [image.typeLabel, image.sizeLabel].filter(Boolean).join(" · ");

	const dragBounds = useMemo(
		() =>
			getDragBounds({
				viewportSize,
				naturalSize,
				zoom,
			}),
		[naturalSize, viewportSize, zoom],
	);

	const resetPan = useCallback(() => {
		x.stop();
		y.stop();

		x.set(0);
		y.set(0);
	}, [x, y]);

	const resetView = useCallback(() => {
		resetPan();
		setZoom(MIN_ZOOM);
	}, [resetPan]);

	const updateZoom = useCallback(
		(nextValue: number | ((current: number) => number)) => {
			setZoom((current) => {
				const next = typeof nextValue === "function" ? clampZoom(nextValue(current)) : clampZoom(nextValue);

				if (next <= MIN_ZOOM) {
					resetPan();
				}

				return next;
			});
		},
		[resetPan],
	);

	const zoomIn = useCallback(() => {
		updateZoom((current) => current + ZOOM_STEP);
	}, [updateZoom]);

	const zoomOut = useCallback(() => {
		updateZoom((current) => current - ZOOM_STEP);
	}, [updateZoom]);

	const toggleControls = useCallback(() => {
		if (suppressToggleRef.current) return;
		setControlsVisible((value) => !value);
	}, []);

	const showControls = useCallback(() => {
		setControlsVisible(true);
	}, []);

	const handlePrevious = useCallback(() => {
		showControls();
		onPrevious?.();
	}, [onPrevious, showControls]);

	const handleNext = useCallback(() => {
		showControls();
		onNext?.();
	}, [onNext, showControls]);

	const handleWheel = useCallback(
		(event: WheelEvent<HTMLDivElement>) => {
			event.preventDefault();
			showControls();

			const direction = event.deltaY < 0 ? 1 : -1;
			updateZoom((current) => current + direction * WHEEL_ZOOM_STEP);
		},
		[showControls, updateZoom],
	);

	useLayoutEffect(() => {
		if (!show) return;

		resetView();
		setControlsVisible(true);
	}, [image.src, resetView, show]);

	useEffect(() => {
		if (!show) return;

		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";

		return () => {
			document.body.style.overflow = previousOverflow;
		};
	}, [show]);

	useEffect(() => {
		x.set(clamp(x.get(), dragBounds.left, dragBounds.right));
		y.set(clamp(y.get(), dragBounds.top, dragBounds.bottom));
	}, [dragBounds.bottom, dragBounds.left, dragBounds.right, dragBounds.top, x, y]);

	useEffect(() => {
		function handleKeyDown(event: KeyboardEvent) {
			if (!show) return;

			if (event.key === "Escape") {
				event.preventDefault();
				onClose();
				return;
			}

			if (event.key === "+" || event.key === "=") {
				event.preventDefault();
				showControls();
				zoomIn();
				return;
			}

			if (event.key === "-" || event.key === "_") {
				event.preventDefault();
				showControls();
				zoomOut();
				return;
			}

			if (event.key === "ArrowLeft" && canGoPrevious) {
				event.preventDefault();
				handlePrevious();
				return;
			}

			if (event.key === "ArrowRight" && canGoNext) {
				event.preventDefault();
				handleNext();
			}
		}

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [canGoNext, canGoPrevious, handleNext, handlePrevious, onClose, resetView, show, showControls, zoomIn, zoomOut]);

	return (
		<AnimatePresence initial={false} onExitComplete={resetView}>
			{show && (
				<motion.div
					role="dialog"
					aria-modal="true"
					aria-label={image.name}
					className={cn(
						placement === "fixed" ? "fixed" : "absolute",
						"inset-0 z-50 overflow-hidden bg-black",
						className,
					)}
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.18 }}
					onWheel={handleWheel}
					onClick={toggleControls}
				>
					<div ref={viewportRef} className="absolute inset-0 overflow-hidden bg-black">
						<motion.img
							src={image.src}
							alt={image.alt ?? image.name}
							draggable={false}
							className={cn(
								"absolute inset-0 h-full w-full select-none object-contain transform-gpu will-change-transform",
								canPan ? "cursor-grab active:cursor-grabbing" : "cursor-default",
							)}
							style={{ x, y }}
							initial={false}
							animate={{ scale: zoom }}
							transition={{
								type: "tween",
								duration: 0.14,
								ease: "easeOut",
							}}
							drag={canPan}
							dragConstraints={dragBounds}
							dragMomentum={false}
							dragElastic={0}
							onDragStart={() => {
								suppressToggleRef.current = true;
								showControls();
							}}
							onDragEnd={() => {
								window.setTimeout(() => {
									suppressToggleRef.current = false;
								}, 0);
							}}
							onLoad={(event) => {
								const loadedImage = event.currentTarget;

								setNaturalSize({
									width: loadedImage.naturalWidth,
									height: loadedImage.naturalHeight,
								});
							}}
						/>
					</div>

					<ImagePreviewControls
						visible={controlsVisible}
						image={image}
						imageMeta={imageMeta}
						zoom={zoom}
						zoomPercent={zoomPercent}
						canGoPrevious={canGoPrevious}
						canGoNext={canGoNext}
						onClose={onClose}
						onZoomIn={zoomIn}
						onZoomOut={zoomOut}
						onResetView={resetView}
						onPrevious={handlePrevious}
						onNext={handleNext}
						onCopy={() => onCopy?.(image)}
						onOpenFile={() => onOpenFile?.(image)}
						onOpenFolder={() => onOpenFolder?.(image)}
					/>
				</motion.div>
			)}
		</AnimatePresence>
	);
}

type ImagePreviewControlsProps = {
	visible: boolean;
	image: HomePreviewImageItem;
	imageMeta: string;
	zoom: number;
	zoomPercent: number;
	canGoPrevious: boolean;
	canGoNext: boolean;
	onClose: () => void;
	onZoomIn: () => void;
	onZoomOut: () => void;
	onResetView: () => void;
	onPrevious: () => void;
	onNext: () => void;
	onCopy: () => void;
	onOpenFile: () => void;
	onOpenFolder: () => void;
};

function ImagePreviewControls({
	visible,
	image,
	imageMeta,
	zoom,
	zoomPercent,
	canGoPrevious,
	canGoNext,
	onClose,
	onZoomIn,
	onZoomOut,
	onResetView,
	onPrevious,
	onNext,
	onCopy,
	onOpenFile,
	onOpenFolder,
}: ImagePreviewControlsProps) {
	return (
		<AnimatePresence initial={false}>
			{visible ? (
				<>
					<motion.div
						key="top-gradient"
						className="pointer-events-none absolute inset-x-0 top-0 z-10 h-24 bg-linear-to-b from-black/65 via-black/25 to-transparent"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.14 }}
					/>

					<motion.div
						key="bottom-gradient"
						className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-64 bg-linear-to-t from-black/75 via-black/35 to-transparent"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.14 }}
					/>

					<motion.div
						key="toolbar"
						className="absolute right-4 top-4 z-20 flex items-center gap-1 rounded-full bg-black/25 p-1 text-white shadow-lg backdrop-blur-md"
						initial={{ opacity: 0, y: -8 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -8 }}
						transition={{ duration: 0.14, ease: "easeOut" }}
						onClick={(event) => event.stopPropagation()}
					>
						<PreviewToolbarButton onClick={onZoomOut} disabled={zoom <= MIN_ZOOM}>
							<LuMinus />
						</PreviewToolbarButton>

						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="min-w-16 px-4 text-xs tabular-nums text-white hover:bg-white/15 hover:text-white"
							onClick={onResetView}
							disabled={zoom === MIN_ZOOM}
						>
							{zoomPercent}%
						</Button>

						<PreviewToolbarButton onClick={onZoomIn} disabled={zoom >= MAX_ZOOM}>
							<LuPlus />
						</PreviewToolbarButton>

						<PreviewToolbarButton onClick={onCopy}>
							<LuCopy />
						</PreviewToolbarButton>

						<PreviewToolbarButton onClick={onClose}>
							<LuX className="size-5" />
						</PreviewToolbarButton>
					</motion.div>

					<PreviewNavButton side="left" disabled={!canGoPrevious} onClick={onPrevious}>
						<LuChevronLeft className="size-7" />
					</PreviewNavButton>

					<PreviewNavButton side="right" disabled={!canGoNext} onClick={onNext}>
						<LuChevronRight className="size-7" />
					</PreviewNavButton>

					<motion.div
						key="bottom-info"
						className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 px-6 pb-6 text-white"
						initial={{ opacity: 0, y: 12 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: 12 }}
						transition={{ duration: 0.14, ease: "easeOut" }}
					>
						<div className="max-w-4xl">
							{imageMeta ? <p className="text-sm text-white/70">{imageMeta}</p> : null}

							<h2
								className="mt-2 max-w-3xl truncate text-3xl font-semibold tracking-tight"
								title={image.name}
							>
								{image.name}
							</h2>

							{image.description ? (
								<p className="mt-3 max-w-4xl text-sm leading-6 text-white/80">{image.description}</p>
							) : null}

							<div
								className="pointer-events-auto mt-5 flex flex-wrap items-center gap-2"
								onClick={(event) => event.stopPropagation()}
							>
								<Button
									type="button"
									variant="secondary"
									className="rounded-full bg-white text-black hover:bg-white/90"
									onClick={onOpenFile}
								>
									<LuExternalLink />
									เปิดไฟล์
								</Button>

								<Button
									type="button"
									variant="outline"
									className="rounded-full border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
									onClick={onOpenFolder}
								>
									<LuFolderOpen />
									เปิดในโฟลเดอร์
								</Button>
							</div>
						</div>
					</motion.div>
				</>
			) : null}
		</AnimatePresence>
	);
}

function PreviewToolbarButton({
	disabled,
	onClick,
	children,
}: {
	disabled?: boolean;
	onClick: () => void;
	children: React.ReactNode;
}) {
	return (
		<Button
			type="button"
			variant="ghost"
			size="icon"
			className="size-9 rounded-full text-white hover:bg-white/15 hover:text-white"
			disabled={disabled}
			onClick={onClick}
		>
			{children}
		</Button>
	);
}

function PreviewNavButton({
	side,
	disabled,
	onClick,
	children,
}: {
	side: "left" | "right";
	disabled: boolean;
	onClick: () => void;
	children: React.ReactNode;
}) {
	if (disabled) return null;

	return (
		<motion.div
			key={`${side}-nav`}
			className={cn("absolute top-1/2 z-20 -translate-y-1/2", side === "left" ? "left-4" : "right-4")}
			initial={{ opacity: 0, x: side === "left" ? -8 : 8 }}
			animate={{ opacity: 1, x: 0 }}
			exit={{ opacity: 0, x: side === "left" ? -8 : 8 }}
			transition={{ duration: 0.14, ease: "easeOut" }}
			onClick={(event) => event.stopPropagation()}
		>
			<Button
				type="button"
				variant="ghost"
				size="icon"
				className="size-12 rounded-full bg-black/25 text-white shadow-lg backdrop-blur-md hover:bg-white/15 hover:text-white"
				onClick={onClick}
			>
				{children}
			</Button>
		</motion.div>
	);
}

import { useCallback, useEffect, useRef, useState } from "react";

import { revokeObjectUrl } from "../preview/preview-utils";
import { isHomeAudioFile, isHomeImageFile, isHomePdfFile, isHomeTextFile, isHomeVideoFile } from "../utils/file-utils";
import { formatHomeFileSize, getHomeMediaCodecLabel, getHomeTextLanguageLabel } from "../utils/format-utils";
import type {
	HomePreviewAudioItem,
	HomePreviewImageItem,
	HomePreviewPdfItem,
	HomePreviewTextItem,
	HomePreviewVideoItem,
} from "../preview/preview-types";
import type { HomeDraftFile, HomeUIProps, PreviewKind } from "../types";

type HomePreviewResolvers = Pick<
	HomeUIProps,
	| "onResolveAudioPreview"
	| "onResolveImagePreview"
	| "onResolvePdfPreview"
	| "onResolveTextPreview"
	| "onResolveVideoPreview"
>;

const MAX_TEXT_PREVIEW_BYTES = 1024 * 1024;

export function useHomePreview({
	onResolveAudioPreview,
	onResolveImagePreview,
	onResolvePdfPreview,
	onResolveTextPreview,
	onResolveVideoPreview,
}: HomePreviewResolvers) {
	const [activePreviewKind, setActivePreviewKind] = useState<PreviewKind>("unknown");
	const [previewAudio, setPreviewAudio] = useState<HomePreviewAudioItem | null>(null);
	const [previewImage, setPreviewImage] = useState<HomePreviewImageItem | null>(null);
	const [previewPdf, setPreviewPdf] = useState<HomePreviewPdfItem | null>(null);
	const [previewText, setPreviewText] = useState<HomePreviewTextItem | null>(null);
	const [previewVideo, setPreviewVideo] = useState<HomePreviewVideoItem | null>(null);
	const objectPreviewsRef = useRef<{
		audio: HomePreviewAudioItem | null;
		pdf: HomePreviewPdfItem | null;
		video: HomePreviewVideoItem | null;
	}>({
		audio: null,
		pdf: null,
		video: null,
	});

	const closeAudioPreview = useCallback(() => {
		setPreviewAudio((current) => {
			revokeObjectUrl(current?.src);
			return null;
		});
		setActivePreviewKind("unknown");
	}, []);

	const closeImagePreview = useCallback(() => {
		setPreviewImage(null);
		setActivePreviewKind("unknown");
	}, []);

	const closePdfPreview = useCallback(() => {
		setPreviewPdf((current) => {
			revokeObjectUrl(current?.src);
			return null;
		});
		setActivePreviewKind("unknown");
	}, []);

	const closeTextPreview = useCallback(() => {
		setPreviewText(null);
		setActivePreviewKind("unknown");
	}, []);

	const closeVideoPreview = useCallback(() => {
		setPreviewVideo((current) => {
			revokeObjectUrl(current?.src);
			return null;
		});
		setActivePreviewKind("unknown");
	}, []);

	const clearPreviewForFile = useCallback((id: string) => {
		setPreviewImage((current) => (current?.id === id ? null : current));
		setPreviewText((current) => (current?.id === id ? null : current));
		setPreviewAudio((current) => closeObjectPreviewForFile(current, id));
		setPreviewPdf((current) => closeObjectPreviewForFile(current, id));
		setPreviewVideo((current) => closeObjectPreviewForFile(current, id));
		setActivePreviewKind("unknown");
	}, []);

	const closePreview = useCallback(() => {
		closeAudioPreview();
		closeImagePreview();
		closePdfPreview();
		closeTextPreview();
		closeVideoPreview();
	}, [closeAudioPreview, closeImagePreview, closePdfPreview, closeTextPreview, closeVideoPreview]);

	const openPreview = useCallback(
		async (file: HomeDraftFile) => {
			if (isHomeAudioFile(file)) {
				const previewUrl = await resolveObjectPreviewUrl(file, onResolveAudioPreview);
				if (!previewUrl) return;

				setPreviewAudio((current) => {
					revokeObjectUrl(current?.src);
					return {
						id: file.id,
						src: previewUrl,
						name: file.name,
						sizeLabel: formatHomeFileSize(file.size),
						codecLabel: getHomeMediaCodecLabel(file, "Audio"),
					};
				});
				setActivePreviewKind("audio");
				return;
			}

			if (isHomeVideoFile(file)) {
				const previewUrl = await resolveObjectPreviewUrl(file, onResolveVideoPreview);
				if (!previewUrl) return;

				setPreviewVideo((current) => {
					revokeObjectUrl(current?.src);
					return {
						id: file.id,
						src: previewUrl,
						name: file.name,
						sizeLabel: formatHomeFileSize(file.size),
						codecLabel: getHomeMediaCodecLabel(file, "Video"),
					};
				});
				setActivePreviewKind("video");
				return;
			}

			if (isHomePdfFile(file)) {
				const previewUrl = await resolveObjectPreviewUrl(file, onResolvePdfPreview);
				if (!previewUrl) return;

				setPreviewPdf((current) => {
					revokeObjectUrl(current?.src);
					return {
						id: file.id,
						src: previewUrl,
						name: file.name,
						sizeLabel: formatHomeFileSize(file.size),
					};
				});
				setActivePreviewKind("pdf");
				return;
			}

			if (isHomeTextFile(file)) {
				if (file.size > MAX_TEXT_PREVIEW_BYTES) return;
				const content = file.sourceFile ? await file.sourceFile.text() : await onResolveTextPreview?.(file);
				if (!content) return;

				setPreviewText({
					id: file.id,
					name: file.name,
					content,
					sizeLabel: formatHomeFileSize(file.size),
					languageLabel: getHomeTextLanguageLabel(file),
				});
				setActivePreviewKind("text");
				return;
			}

			if (!isHomeImageFile(file)) return;

			const previewUrl = file.previewUrl ?? (await onResolveImagePreview?.(file));
			if (!previewUrl) return;

			setPreviewImage({
				id: file.id,
				src: previewUrl,
				name: file.name,
				sizeLabel: formatHomeFileSize(file.size),
				typeLabel: file.mimeType?.startsWith("image/") ? file.mimeType : "รูปภาพ",
			});
			setActivePreviewKind("image");
		},
		[
			onResolveAudioPreview,
			onResolveImagePreview,
			onResolvePdfPreview,
			onResolveTextPreview,
			onResolveVideoPreview,
		],
	);

	useEffect(() => {
		objectPreviewsRef.current = {
			audio: previewAudio,
			pdf: previewPdf,
			video: previewVideo,
		};
	}, [previewAudio, previewPdf, previewVideo]);

	useEffect(
		() => () => {
			const { audio, pdf, video } = objectPreviewsRef.current;
			revokeObjectUrl(audio?.src);
			revokeObjectUrl(pdf?.src);
			revokeObjectUrl(video?.src);
		},
		[],
	);

	return {
		activePreviewKind,
		activePreviewFile: previewAudio ?? previewImage ?? previewPdf ?? previewText ?? previewVideo,
		previewAudio,
		previewImage,
		previewPdf,
		previewText,
		previewVideo,
		clearPreviewForFile,
		closeAudioPreview,
		closeImagePreview,
		closePdfPreview,
		closePreview,
		closeTextPreview,
		closeVideoPreview,
		openPreview,
	};
}

async function resolveObjectPreviewUrl(
	file: HomeDraftFile,
	resolver?: (file: HomeDraftFile) => Promise<string | undefined>,
) {
	if (file.sourceFile) {
		return URL.createObjectURL(file.sourceFile);
	}

	return resolver?.(file);
}

function closeObjectPreviewForFile<T extends { id?: string; src: string }>(preview: T | null, id: string) {
	if (preview?.id !== id) return preview;
	revokeObjectUrl(preview.src);
	return null;
}

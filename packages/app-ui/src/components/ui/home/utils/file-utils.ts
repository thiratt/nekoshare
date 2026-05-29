import { getFileName } from "../../drop-overlay";
import type { HomeDraftFile, HomeDroppedPath, PreviewKind } from "../types";

const IMAGE_EXTENSIONS = new Set(["avif", "bmp", "gif", "jpg", "jpeg", "png", "webp"]);
const AUDIO_EXTENSIONS = new Set(["aac", "flac", "m4a", "mp3", "oga", "ogg", "opus", "wav", "weba"]);
const PDF_EXTENSIONS = new Set(["pdf"]);
const VIDEO_EXTENSIONS = new Set(["avi", "m4v", "mkv", "mov", "mp4", "mpeg", "mpg", "ogv", "webm"]);
const TEXT_EXTENSIONS = new Set([
	"c",
	"conf",
	"cpp",
	"cs",
	"css",
	"csv",
	"env",
	"go",
	"html",
	"java",
	"js",
	"json",
	"jsx",
	"kt",
	"log",
	"md",
	"rs",
	"sh",
	"sql",
	"svg",
	"toml",
	"ts",
	"tsx",
	"txt",
	"xml",
	"yaml",
	"yml",
]);

const TEXT_MIME_TYPES = new Set([
	"application/json",
	"application/javascript",
	"application/typescript",
	"application/xml",
	"image/svg+xml",
]);

export function getFileExtension(name: string) {
	const extension = name.includes(".") ? name.split(".").pop() : undefined;
	return extension?.toLowerCase() ?? "";
}

export function isHomeImageFile(file: Pick<HomeDraftFile, "mimeType" | "name">) {
	if (file.mimeType?.startsWith("image/")) return true;
	return IMAGE_EXTENSIONS.has(getFileExtension(file.name));
}

export function isHomeAudioFile(file: Pick<HomeDraftFile, "mimeType" | "name">) {
	if (file.mimeType?.startsWith("audio/")) return true;
	return AUDIO_EXTENSIONS.has(getFileExtension(file.name));
}

export function isHomePdfFile(file: Pick<HomeDraftFile, "mimeType" | "name">) {
	if (file.mimeType === "application/pdf") return true;
	return PDF_EXTENSIONS.has(getFileExtension(file.name));
}

export function isHomeVideoFile(file: Pick<HomeDraftFile, "mimeType" | "name">) {
	if (file.mimeType?.startsWith("video/")) return true;
	return VIDEO_EXTENSIONS.has(getFileExtension(file.name));
}

export function isHomeTextFile(file: Pick<HomeDraftFile, "mimeType" | "name">) {
	if (file.mimeType?.startsWith("text/")) return true;
	if (file.mimeType && TEXT_MIME_TYPES.has(file.mimeType)) return true;
	return TEXT_EXTENSIONS.has(getFileExtension(file.name));
}

export function isHomePreviewableFile(file: Pick<HomeDraftFile, "mimeType" | "name">) {
	return (
		isHomeAudioFile(file) ||
		isHomeImageFile(file) ||
		isHomePdfFile(file) ||
		isHomeTextFile(file) ||
		isHomeVideoFile(file)
	);
}

export function getPreviewKind(file: Pick<HomeDraftFile, "mimeType" | "name">): PreviewKind {
	if (isHomeImageFile(file)) return "image";
	if (isHomeTextFile(file)) return "text";
	if (isHomePdfFile(file)) return "pdf";
	if (isHomeVideoFile(file)) return "video";
	if (isHomeAudioFile(file)) return "audio";
	return "unknown";
}

export function createHomeDraftFileId(file: Pick<File, "lastModified" | "name" | "size">) {
	return `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`;
}

export function createHomeDraftFile(file: File): HomeDraftFile {
	const draftFile = {
		id: createHomeDraftFileId(file),
		name: file.name,
		size: file.size,
		sourceFile: file,
		mimeType: file.type || undefined,
	};
	const previewKind = getPreviewKind(draftFile);

	if (!isHomeImageFile(draftFile)) {
		return { ...draftFile, previewKind };
	}

	return {
		...draftFile,
		previewKind,
		previewUrl: URL.createObjectURL(file),
	};
}

export function createHomeDraftFileFromPath(entry: HomeDroppedPath): HomeDraftFile {
	const name = entry.name ?? getFileName(entry.path);

	return {
		id: `${entry.path}-${entry.size ?? 0}-${Math.random().toString(36).slice(2)}`,
		name,
		path: entry.path,
		size: entry.size ?? 0,
		mimeType: entry.mimeType,
		previewKind: entry.previewKind ?? getPreviewKind({ name, mimeType: entry.mimeType }),
		previewUrl: entry.previewUrl,
	};
}

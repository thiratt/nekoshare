import { readFile, readTextFile, stat } from "@tauri-apps/plugin-fs";

import { createFileEntry } from "@workspace/app-ui/components/ui/drop-overlay/index";
import type { HomeDraftFile, HomeDroppedPath } from "@workspace/app-ui/components/ui/home/index";

const AUDIO_MIME_BY_EXTENSION: Record<string, string> = {
	aac: "audio/aac",
	flac: "audio/flac",
	m4a: "audio/mp4",
	mp3: "audio/mpeg",
	oga: "audio/ogg",
	ogg: "audio/ogg",
	opus: "audio/ogg",
	wav: "audio/wav",
	weba: "audio/webm",
};

const DOCUMENT_MIME_BY_EXTENSION: Record<string, string> = {
	pdf: "application/pdf",
};

const IMAGE_MIME_BY_EXTENSION: Record<string, string> = {
	avif: "image/avif",
	bmp: "image/bmp",
	gif: "image/gif",
	jpg: "image/jpeg",
	jpeg: "image/jpeg",
	png: "image/png",
	webp: "image/webp",
};

const TEXT_MIME_BY_EXTENSION: Record<string, string> = {
	conf: "text/plain",
	css: "text/css",
	csv: "text/csv",
	env: "text/plain",
	html: "text/html",
	js: "text/javascript",
	json: "application/json",
	jsx: "text/javascript",
	log: "text/plain",
	md: "text/markdown",
	rs: "text/plain",
	sql: "text/plain",
	svg: "image/svg+xml",
	toml: "text/plain",
	ts: "application/typescript",
	tsx: "application/typescript",
	txt: "text/plain",
	xml: "application/xml",
	yaml: "text/yaml",
	yml: "text/yaml",
};

const VIDEO_MIME_BY_EXTENSION: Record<string, string> = {
	avi: "video/x-msvideo",
	m4v: "video/mp4",
	mkv: "video/x-matroska",
	mov: "video/quicktime",
	mp4: "video/mp4",
	mpeg: "video/mpeg",
	mpg: "video/mpeg",
	ogv: "video/ogg",
	webm: "video/webm",
};

export async function resolveDroppedPaths(paths: string[]): Promise<HomeDroppedPath[]> {
	return Promise.all(paths.map(resolveDroppedPath));
}

export async function resolveAudioPreview(file: HomeDraftFile) {
	if (!file.path || !file.mimeType?.startsWith("audio/")) return undefined;
	return createBlobPreviewUrl(file.path, file.mimeType);
}

export async function resolveImagePreview(file: HomeDraftFile) {
	if (!file.path || !file.mimeType?.startsWith("image/")) return file.previewUrl;
	return createImagePreviewUrl(file.path, file.mimeType);
}

export async function resolvePdfPreview(file: HomeDraftFile) {
	if (!file.path || file.mimeType !== "application/pdf") return undefined;
	return createBlobPreviewUrl(file.path, file.mimeType);
}

export async function resolveTextPreview(file: HomeDraftFile) {
	if (!file.path) return undefined;
	return readTextFile(file.path);
}

export async function resolveVideoPreview(file: HomeDraftFile) {
	if (!file.path || !file.mimeType?.startsWith("video/")) return undefined;
	return createBlobPreviewUrl(file.path, file.mimeType);
}

async function resolveDroppedPath(path: string): Promise<HomeDroppedPath> {
	try {
		const fileStat = await stat(path);
		return createDroppedPath(path, fileStat.size);
	} catch (error) {
		console.error(`Failed to get stats for ${path}:`, error);
		return createDroppedPath(path, 0);
	}
}

function createDroppedPath(path: string, size: number): HomeDroppedPath {
	const fileEntry = createFileEntry(path, size);
	const mimeType = getFileMimeType(path);

	return {
		path,
		name: fileEntry.name,
		size: fileEntry.size,
		mimeType,
	};
}

function getFileMimeType(path: string) {
	const extension = getFileExtension(path);
	if (!extension) return undefined;

	return (
		AUDIO_MIME_BY_EXTENSION[extension] ??
		IMAGE_MIME_BY_EXTENSION[extension] ??
		DOCUMENT_MIME_BY_EXTENSION[extension] ??
		VIDEO_MIME_BY_EXTENSION[extension] ??
		TEXT_MIME_BY_EXTENSION[extension]
	);
}

function getFileExtension(path: string) {
	const fileName = path.split(/[\\/]/).pop() ?? path;
	return fileName.includes(".") ? fileName.split(".").pop()?.toLowerCase() : undefined;
}

async function createImagePreviewUrl(path: string, mimeType: string) {
	const bytes = await readFile(path);
	return `data:${mimeType};base64,${bytesToBase64(bytes)}`;
}

async function createBlobPreviewUrl(path: string, mimeType: string) {
	const bytes = await readFile(path);
	return URL.createObjectURL(new Blob([bytes], { type: mimeType }));
}

function bytesToBase64(bytes: Uint8Array) {
	let binary = "";
	const chunkSize = 0x8000;

	for (let offset = 0; offset < bytes.length; offset += chunkSize) {
		const chunk = bytes.subarray(offset, offset + chunkSize);
		binary += String.fromCharCode(...chunk);
	}

	return window.btoa(binary);
}


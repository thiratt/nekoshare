import { LuFile, LuFileArchive, LuFileAudio, LuFileImage, LuFileText, LuFileVideo } from "react-icons/lu";

import type { DropPosition, DropZoneRect, FileEntry, FileOptions } from "./types";

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico"]);
const VIDEO_EXTENSIONS = new Set(["mp4", "mov", "avi", "mkv", "webm", "flv"]);
const AUDIO_EXTENSIONS = new Set(["mp3", "wav", "flac", "aac", "ogg", "m4a"]);
const ARCHIVE_EXTENSIONS = new Set(["zip", "rar", "7z", "tar", "gz", "bz2"]);
const TEXT_EXTENSIONS = new Set(["txt", "md", "doc", "docx", "pdf", "rtf"]);

export function getFileIcon(extension: string) {
	const ext = extension.toLowerCase();
	if (IMAGE_EXTENSIONS.has(ext)) return LuFileImage;
	if (VIDEO_EXTENSIONS.has(ext)) return LuFileVideo;
	if (AUDIO_EXTENSIONS.has(ext)) return LuFileAudio;
	if (ARCHIVE_EXTENSIONS.has(ext)) return LuFileArchive;
	if (TEXT_EXTENSIONS.has(ext)) return LuFileText;
	return LuFile;
}

export function getFileName(path: string): string {
	const lastSlash = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
	return lastSlash === -1 ? path : path.substring(lastSlash + 1);
}

export function getFileExtension(name: string): string {
	const lastDot = name.lastIndexOf(".");
	return lastDot === -1 || lastDot === name.length - 1 ? "" : name.substring(lastDot + 1).toLowerCase();
}

const SIZE_UNITS = ["B", "KB", "MB", "GB"] as const;

export function formatFileSize(bytes?: number): string {
	if (!bytes || bytes === 0) return "";

	let size = bytes;
	let unitIndex = 0;

	while (size >= 1024 && unitIndex < SIZE_UNITS.length - 1) {
		size /= 1024;
		unitIndex++;
	}

	return unitIndex === 0 ? `${size} ${SIZE_UNITS[unitIndex]}` : `${size.toFixed(1)} ${SIZE_UNITS[unitIndex]}`;
}

export function generateId(): string {
	return Math.random().toString(36).substring(2, 9);
}

export function pointInRect(x: number, y: number, rect: DOMRect): boolean {
	if (x < rect.left || x > rect.right) return false;
	if (y < rect.top || y > rect.bottom) return false;
	return true;
}

export function findDropZoneAtPosition(position: DropPosition, zones: DropZoneRect[]): DropZoneRect | null {
	for (const zone of zones) {
		if (pointInRect(position.x, position.y, zone.rect)) {
			return zone;
		}
	}
	return null;
}

export function cacheDropZonesFromContainer(container: HTMLElement | null): DropZoneRect[] {
	if (!container) return [];

	const elements = container.querySelectorAll<HTMLElement>("[data-drop-id]");
	const zones: DropZoneRect[] = [];

	elements.forEach((el) => {
		const dropId = el.dataset.dropId;
		const dropType = el.dataset.dropType as DropZoneRect["type"];
		if (dropId && dropType) {
			zones.push({
				id: dropId,
				type: dropType,
				rect: el.getBoundingClientRect(),
			});
		}
	});

	return zones;
}

export function createFileEntry(path: string, size: number = 0, overrides?: Partial<FileOptions>): FileEntry {
	const name = getFileName(path);
	return {
		id: generateId(),
		path,
		name,
		size,
		extension: getFileExtension(name),
		targets: [],
		options: {
			encrypt: false,
			compress: true,
			public: false,
			...overrides,
		},
		status: "pending",
	};
}

export function pluralize(count: number, singular: string, plural?: string): string {
	return count === 1 ? singular : (plural ?? `${singular}s`);
}

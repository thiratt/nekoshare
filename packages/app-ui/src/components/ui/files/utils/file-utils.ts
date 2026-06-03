import type { IconType } from "react-icons";

import { LuArchive, LuFile, LuFileImage, LuFileText, LuFilm } from "react-icons/lu";

import { fileTypeLabel } from "../constants";
import type { FileKind, FilesPageItem } from "../types";

export function getFileKind(name: string): FileKind {
	const extension = name.includes(".") ? name.split(".").pop()?.toLowerCase() : undefined;
	if (!extension) return "file";
	if (["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "heic"].includes(extension)) return "image";
	if (["mp4", "mov", "mkv", "avi", "wmv", "webm"].includes(extension)) return "video";
	if (["zip", "rar", "7z", "tar", "gz", "bz2", "xz"].includes(extension)) return "archive";
	if (["pdf", "doc", "docx", "txt", "md", "rtf", "odt", "xls", "xlsx", "csv", "ppt", "pptx"].includes(extension)) {
		return "document";
	}
	return "file";
}

export function getReceivedFileIcon(type: FileKind): IconType {
	switch (type) {
		case "image":
			return LuFileImage;
		case "document":
			return LuFileText;
		case "video":
			return LuFilm;
		case "archive":
			return LuArchive;
		case "file":
			return LuFile;
	}
}

export function formatFileSize(size: number) {
	if (!Number.isFinite(size) || size <= 0) return "0 B";

	const units = ["B", "KB", "MB", "GB", "TB"] as const;
	let value = size;
	let unitIndex = 0;

	while (value >= 1024 && unitIndex < units.length - 1) {
		value /= 1024;
		unitIndex++;
	}

	const digits = value >= 100 || unitIndex === 0 ? 0 : value >= 10 ? 1 : 2;
	return `${value.toFixed(digits)} ${units[unitIndex]}`;
}

export function formatRelativeTime(timestamp: number) {
	const elapsedMs = Date.now() - timestamp;
	if (!Number.isFinite(elapsedMs) || elapsedMs < 60_000) return "เมื่อสักครู่";

	const minutes = Math.floor(elapsedMs / 60_000);
	if (minutes < 60) return `${minutes} นาทีที่แล้ว`;

	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours} ชม. ที่แล้ว`;

	const days = Math.floor(hours / 24);
	return days === 1 ? "เมื่อวาน" : `${days} วันที่แล้ว`;
}

export function matchReceivedFileSearch(file: FilesPageItem, query: string) {
	const normalizedQuery = query.trim().toLowerCase();
	if (!normalizedQuery) return true;

	return [
		file.fileName,
		file.peerName ?? "",
		file.filePath,
		file.direction === "send" ? "sent ส่ง" : "received รับ",
		file.status === "completed" ? "completed เสร็จแล้ว" : "failed ล้มเหลว",
		file.availability === "missing" ? "missing ไม่พบไฟล์" : "",
		fileTypeLabel(getFileKind(file.fileName)),
	]
		.join(" ")
		.toLowerCase()
		.includes(normalizedQuery);
}

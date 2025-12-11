import { LuCircleAlert, LuCircleCheck, LuClock } from "react-icons/lu";

export const MOCK_DEVICES = ["MacBook Pro M2", "Dell XPS 13", "iPhone 15 Pro", "Galaxy S24", "iPad Pro"];

export const ITEMS_PER_PAGE = 10;

export const STATUS_CONFIG = {
	success: {
		icon: LuCircleCheck,
		color: "text-green-600 bg-green-50 dark:text-green-50 dark:bg-green-900",
		label: "สำเร็จ",
	},
	failed: {
		icon: LuCircleAlert,
		color: "text-red-600 bg-red-50 dark:text-red-50 dark:bg-destructive/60",
		label: "ล้มเหลว",
	},
	processing: {
		icon: LuClock,
		color: "text-yellow-600 bg-yellow-50 dark:text-yellow-50 dark:bg-yellow-900",
		label: "กำลังประมวลผล",
	},
} as const;

export function formatFileSize(bytes: number): string {
	if (bytes === 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB", "TB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function getFileType(filename: string): string {
	const ext = filename.split(".").pop()?.toLowerCase() || "";
	const typeMap: Record<string, string> = {
		pdf: "pdf",
		doc: "document",
		docx: "document",
		xls: "spreadsheet",
		xlsx: "spreadsheet",
		ppt: "presentation",
		pptx: "presentation",
		jpg: "image",
		jpeg: "image",
		png: "image",
		gif: "image",
		webp: "image",
		mp4: "video",
		mov: "video",
		avi: "video",
		mp3: "audio",
		wav: "audio",
		zip: "zip",
		rar: "archive",
		"7z": "archive",
		txt: "text",
		json: "code",
		js: "code",
		ts: "code",
	};
	return typeMap[ext] || "file";
}

export function formatDate(isoString: string): string {
	const date = new Date(isoString);
	return date.toLocaleDateString("th-TH", {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

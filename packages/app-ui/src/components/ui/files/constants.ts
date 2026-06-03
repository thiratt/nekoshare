import type { FileKind } from "./types";

export function fileTypeLabel(type: FileKind) {
	switch (type) {
		case "image":
			return "รูปภาพ";
		case "document":
			return "เอกสาร";
		case "video":
			return "วิดีโอ";
		case "archive":
			return "ไฟล์บีบอัด";
		case "file":
			return "ไฟล์";
	}
}

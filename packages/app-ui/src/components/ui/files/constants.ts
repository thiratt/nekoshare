import type { FileKind, ReceivedFile } from "./types";

export const mockReceivedFiles: ReceivedFile[] = [
	{
		id: "screenshot",
		name: "screenshot.png",
		type: "image",
		size: "2.4 MB",
		sizeBytes: 2_400_000,
		source: "Max iPad",
		receivedAt: "วันนี้",
		localPath: "~/Downloads/Neko Share/screenshot.png",
	},
	{
		id: "report",
		name: "report.pdf",
		type: "document",
		size: "12 MB",
		sizeBytes: 12_000_000,
		source: "Office PC",
		receivedAt: "เมื่อวาน",
		localPath: "~/Downloads/Neko Share/report.pdf",
	},
	{
		id: "project-demo",
		name: "project-demo.mov",
		type: "video",
		size: "4.7 GB",
		sizeBytes: 4_700_000_000,
		source: "Max Laptop",
		receivedAt: "2 วันที่แล้ว",
		localPath: "~/Downloads/Neko Share/project-demo.mov",
	},
	{
		id: "backup-photos",
		name: "backup-photos.zip",
		type: "archive",
		size: "1.2 GB",
		sizeBytes: 1_200_000_000,
		source: "Max Laptop",
		receivedAt: "3 วันที่แล้ว",
		localPath: "~/Downloads/Neko Share/backup-photos.zip",
	},
];

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
	}
}

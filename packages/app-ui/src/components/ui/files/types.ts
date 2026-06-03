export type FileKind = "image" | "document" | "video" | "archive" | "file";

export type FilesPageItem = {
	id: string;
	transferId: string;
	fileId: string;
	fileName: string;
	filePath: string;
	direction: "send" | "receive";
	status: "completed" | "failed";
	availability: "available" | "missing" | "unknown";
	peerName?: string;
	size: number;
	transferredBytes: number;
	progress: number;
	updatedAt: number;
	errorMessage?: string;
};

export type FilesPageAction = (item: FilesPageItem) => void | Promise<void>;

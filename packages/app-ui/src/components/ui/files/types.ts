export type FileKind = "image" | "document" | "video" | "archive";

export type ReceivedFile = {
	id: string;
	name: string;
	type: FileKind;
	size: string;
	sizeBytes: number;
	source: string;
	receivedAt: string;
	localPath: string;
};

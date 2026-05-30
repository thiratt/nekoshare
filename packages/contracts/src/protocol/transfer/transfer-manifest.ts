export const TransferManifestItemKind = {
	FILE: "file",
	FOLDER: "folder",
	TEXT: "text",
} as const;

export type TransferManifestItemKind = (typeof TransferManifestItemKind)[keyof typeof TransferManifestItemKind];

export interface TransferManifestBaseItem {
	id: string;
	kind: TransferManifestItemKind;
	name?: string;
	size?: number;
	mimeType?: string;
}

export interface TransferFileManifestItem extends TransferManifestBaseItem {
	kind: typeof TransferManifestItemKind.FILE;
	name: string;
	size: number;
	relativePath?: string;
	lastModifiedAt?: string;
	checksum?: string;
}

export interface TransferFolderManifestItem extends TransferManifestBaseItem {
	kind: typeof TransferManifestItemKind.FOLDER;
	name: string;
	relativePath?: string;
	fileCount?: number;
	totalBytes?: number;
}

export interface TransferTextManifestItem extends TransferManifestBaseItem {
	kind: typeof TransferManifestItemKind.TEXT;
	text: string;
	mimeType?: string;
}

export type TransferManifestItem = TransferFileManifestItem | TransferFolderManifestItem | TransferTextManifestItem;

export interface TransferManifest {
	id: string;
	items: TransferManifestItem[];
	totalBytes?: number;
	createdAt: string;
}

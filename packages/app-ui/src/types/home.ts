export type Status = "success" | "failed" | "processing";

export interface FileData {
	name: string;
	size: number;
	isFile: boolean;
	isDirectory: boolean;
	createdAt: Date | null;
	modifiedAt: Date | null;
	accessedAt: Date | null;
}

export interface ShareItem {
	id: number;
	type: "text" | "file";
	content: string;
	fileName?: string;
	fileSize?: string;
	deviceName: string;
	timestamp: string;
	status: Status;
}

export interface HomeProps {
	onItemClick: (id: number) => void;
	onItemReveal: (id: number) => void;
	onBulkDelete: (ids: number[]) => void;
	data: FileData[];
	loading?: boolean;
}

export interface DeleteItemDialog {
	id: number;
}

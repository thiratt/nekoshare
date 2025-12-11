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
	name: string;
	from: "me" | "buddy";
	device: string | null;
	friendName?: string;
	status: Status;
	uploadedAt: string;
	isReaded: boolean;
	canDownload: boolean;
	size?: string;
	type?: string;
	sharedWith?: number;
}

export interface HomeProps {
	onItemClick: (id: number) => void;
	onItemReveal: (id: number) => void;
	onItemRemove: (id: number) => Promise<void>;
	onBulkDelete: (ids: number[]) => void;
	data: FileData[];
	loading?: boolean;
}

export interface DeleteItemDialog {
	id: number;
}

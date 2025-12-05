export type Status = "success" | "failed" | "processing";

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
	onItemDownload: (id: number) => void;
	onBulkDelete: (ids: number[]) => void;
	data: { filename: string; size: number }[];
}

export interface DeleteItemDialog {
	id: number;
}

export type Status = "success" | "failed" | "processing";

export interface TransferSnapshot {
	status: Status;
	progressPercent?: number;
	fromIsMe?: boolean;
	fromLabel?: string;
	deviceLabel?: string | null;
	error?: string | null;
	updatedAt?: string;
}

export interface FileData {
	name: string;
	path: string;
	size: number;
	isFile: boolean;
	isDirectory: boolean;
	createdAt: Date | null;
	modifiedAt: Date | null;
	accessedAt: Date | null;
	transfer?: TransferSnapshot;
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
	progressPercent?: number;
	error?: string | null;
}

export type InvokeFunction = <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;

export interface HomeProps {
	onItemClick: (id: number) => void;
	onItemReveal: (id: number) => void;
	onItemRemove: (id: number) => Promise<void>;
	onBulkDelete: (ids: number[]) => void;
	onRefresh?: () => Promise<void> | void;
	data: FileData[];
	loading?: boolean;
	invoke?: InvokeFunction;
}

export interface DeleteItemDialog {
	id: number;
}

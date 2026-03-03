export type TransferStatus = "transferring" | "completed" | "failed";
export type TransferFileStatus = "transferring" | "success" | "queued" | "failed" | "cancelled" | "paused";
export type EncryptionType = "none" | "encrypted";
export type TransferLayout = "vertical" | "horizontal";

export interface TransferFileItem {
	id: string;
	name: string;
	sizeLabel: string;
	progress: number;
	status: TransferFileStatus;
	error?: string;
}

export interface TransferRecipient {
	id: string;
	deviceName: string;
	avatar?: string;
	status: TransferStatus;
	encryption: EncryptionType;
	files: TransferFileItem[];
	errorMessage?: string;
}

export interface TransferDetailData {
	title: string;
	subtitle: string;
	recipients: TransferRecipient[];
}

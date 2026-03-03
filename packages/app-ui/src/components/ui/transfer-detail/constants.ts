import type { TransferDetailData, TransferFileStatus, TransferStatus } from "./types";

export function transferStatusConfig(status: TransferStatus) {
	switch (status) {
		case "transferring":
			return { label: "Transferring", variant: "default" as const, className: "" };
		case "completed":
			return {
				label: "Completed",
				variant: "secondary" as const,
				className:
					"border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400",
			};
		case "failed":
			return {
				label: "Failed",
				variant: "secondary" as const,
				className:
					"border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400",
			};
	}
}

export function fileStatusColor(status: TransferFileStatus) {
	if (status === "success") return "text-emerald-500";
	if (status === "transferring") return "text-blue-500";
	if (status === "failed") return "text-red-500";
	if (status === "cancelled") return "text-muted-foreground";
	if (status === "paused") return "text-amber-500";
	return "text-muted-foreground";
}

export function fileStatusLabel(status: TransferFileStatus) {
	switch (status) {
		case "success":
			return "Done";
		case "transferring":
			return null;
		case "failed":
			return "Failed";
		case "cancelled":
			return "Cancelled";
		case "paused":
			return "Paused";
		case "queued":
			return "Queued";
	}
}

export const FINISHED_STATUSES = new Set(["success", "failed", "cancelled"]);

export const MOCK_DATA: TransferDetailData = {
	title: "Sending Files",
	subtitle: "Transfer to 3 devices",
	recipients: [
		{
			id: "r-1",
			deviceName: "Ken's MacBook Pro",
			status: "transferring",
			encryption: "encrypted",
			files: [
				{
					id: "r1-file-1",
					name: "Design-System-v2.fig",
					sizeLabel: "42.1 MB",
					progress: 72,
					status: "transferring",
				},
				{
					id: "r1-file-2",
					name: "meeting-notes.md",
					sizeLabel: "1.2 MB",
					progress: 100,
					status: "success",
				},
				{
					id: "r1-file-3",
					name: "release-checklist.pdf",
					sizeLabel: "8.7 MB",
					progress: 0,
					status: "queued",
				},
			],
		},
		{
			id: "r-2",
			deviceName: "Lisa's iPhone 16",
			status: "completed",
			encryption: "encrypted",
			files: [
				{
					id: "r2-file-1",
					name: "Design-System-v2.fig",
					sizeLabel: "42.1 MB",
					progress: 100,
					status: "success",
				},
				{
					id: "r2-file-2",
					name: "meeting-notes.md",
					sizeLabel: "1.2 MB",
					progress: 100,
					status: "success",
				},
			],
		},
		{
			id: "r-3",
			deviceName: "Office Desktop",
			status: "failed",
			encryption: "none",
			errorMessage: "Connection timed out",
			files: [
				{
					id: "r3-file-1",
					name: "Design-System-v2.fig",
					sizeLabel: "42.1 MB",
					progress: 35,
					status: "failed",
					error: "Connection lost",
				},
				{
					id: "r3-file-2",
					name: "meeting-notes.md",
					sizeLabel: "1.2 MB",
					progress: 100,
					status: "success",
				},
			],
		},
	],
};

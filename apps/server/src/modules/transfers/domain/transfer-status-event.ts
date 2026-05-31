export const TransferStatusEventType = {
	TRANSFER_STATUS_CHANGED: "TRANSFER_STATUS_CHANGED",
	TRANSFER_PROGRESS_UPDATED: "TRANSFER_PROGRESS_UPDATED",
	TRANSFER_COMPLETED: "TRANSFER_COMPLETED",
	TRANSFER_FAILED: "TRANSFER_FAILED",
	TRANSPORT_CHANGED: "TRANSPORT_CHANGED",
	TRANSPORT_FAILED: "TRANSPORT_FAILED",
} as const;

export type TransferStatusEventType =
	(typeof TransferStatusEventType)[keyof typeof TransferStatusEventType];

export const RuntimeTransferEventType = {
	[TransferStatusEventType.TRANSFER_STATUS_CHANGED]: "status-changed",
	[TransferStatusEventType.TRANSFER_PROGRESS_UPDATED]: "progress-updated",
	[TransferStatusEventType.TRANSFER_COMPLETED]: "status-changed",
	[TransferStatusEventType.TRANSFER_FAILED]: "error",
	[TransferStatusEventType.TRANSPORT_CHANGED]: "status-changed",
	[TransferStatusEventType.TRANSPORT_FAILED]: "error",
} as const;

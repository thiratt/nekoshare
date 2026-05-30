export const TransferStatus = {
	OFFERED: "OFFERED",
	ACCEPTED: "ACCEPTED",
	PREPARING: "PREPARING",
	CONNECTING: "CONNECTING",
	TRANSFERRING: "TRANSFERRING",
	PAUSED: "PAUSED",
	COMPLETED: "COMPLETED",
	REJECTED: "REJECTED",
	CANCELLED: "CANCELLED",
	FAILED: "FAILED",
	EXPIRED: "EXPIRED",
} as const;

export type TransferStatus = (typeof TransferStatus)[keyof typeof TransferStatus];

import type { HistoryTransferFilter, TransferDeliveryState } from "./types";

export const TRANSFER_LIST_TRANSITION = {
	type: "spring",
	duration: 0.32,
	bounce: 0,
} as const;

export const TRANSFER_ITEM_TRANSITION = {
	type: "spring",
	duration: 0.28,
	bounce: 0,
	opacity: {
		duration: 0.14,
	},
} as const;

export const ACTIVE_STATES = new Set<TransferDeliveryState>(["queued", "transferring", "paused", "verifying"]);

export const PAUSABLE_STATES = new Set<TransferDeliveryState>(["transferring"]);

export const TERMINAL_STATES = new Set<TransferDeliveryState>(["completed", "failed", "cancelled", "skipped"]);

export const HISTORY_FILTER_ITEMS: {
	value: HistoryTransferFilter;
	label: string;
}[] = [
	{
		value: "all",
		label: "ทั้งหมด",
	},
	{
		value: "active",
		label: "กำลังดำเนินการ",
	},
	{
		value: "failed",
		label: "ล้มเหลว",
	},
];

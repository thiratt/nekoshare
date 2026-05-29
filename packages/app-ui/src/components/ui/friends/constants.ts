import type { FriendStatus } from "@workspace/app-ui/types/friends";

import type { AvailableUserSearchStatus, UserSearchStatusInfo } from "./types";

export const PAGE_SIZE = 8;

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const isValidEmail = (value: string): boolean => EMAIL_REGEX.test(value);

export const STATUS_CONFIG: Record<
	FriendStatus,
	{ label: string; variant: "default" | "outline" | "secondary" | "destructive" }
> = {
	none: { label: "", variant: "outline" },
	outgoing: { label: "รอการตอบรับ", variant: "outline" },
	incoming: { label: "คำขอเป็นเพื่อน", variant: "secondary" },
	friend: { label: "เพื่อน", variant: "default" },
	blocked: { label: "บล็อค", variant: "destructive" },
};

export const USER_SEARCH_STATUS_LABELS: Record<AvailableUserSearchStatus, UserSearchStatusInfo> = {
	friend: { label: "เพื่อนแล้ว", color: "text-emerald-600 dark:text-emerald-400" },
	outgoing: { label: "รอตอบรับ", color: "text-amber-600 dark:text-amber-400" },
	incoming: { label: "รอยอมรับ", color: "text-blue-600 dark:text-blue-400" },
	blocked: { label: "ถูกบล็อค", color: "text-red-600 dark:text-red-400" },
};

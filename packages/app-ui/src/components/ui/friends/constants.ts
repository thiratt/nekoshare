import type { FriendStatus } from "@workspace/app-ui/types/friends";

export const PAGE_SIZE = 8;

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const isValidEmail = (value: string): boolean => EMAIL_REGEX.test(value);

export const STATUS_CONFIG: Record<FriendStatus, { label: string; variant: "default" | "outline" | "secondary" | "destructive" }> = {
	none: { label: "", variant: "outline" },
	outgoing: { label: "รอการตอบรับ", variant: "outline" },
	incoming: { label: "คำขอเป็นเพื่อน", variant: "secondary" },
	friend: { label: "เพื่อน", variant: "default" },
	blocked: { label: "บล็อค", variant: "destructive" },
};

export const formatDate = (dateString: string): string => {
	try {
		return new Date(dateString).toLocaleString();
	} catch {
		return dateString;
	}
};

export const getInitials = (name: string): string => {
	const parts = name.trim().split(" ").filter(Boolean);
	return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
};

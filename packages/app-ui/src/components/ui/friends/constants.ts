import type { FriendStatus } from "@workspace/app-ui/types/friends";

export const PAGE_SIZE = 8;

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const isValidEmail = (value: string): boolean => EMAIL_REGEX.test(value);

export const STATUS_CONFIG: Record<FriendStatus, { label: string; variant: "default" | "outline" }> = {
	active: { label: "active", variant: "default" },
	pending: { label: "pending", variant: "outline" },
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

import type { TransferFilter, TransferItem, TransferStatus } from "../types";

export function matchesTransferFilter(transfer: TransferItem, filter: TransferFilter) {
	switch (filter) {
		case "all":
			return true;

		case "sending":
			return transfer.direction === "outgoing" && isActiveTransfer(transfer);

		case "receiving":
			return transfer.direction === "incoming" && isActiveTransfer(transfer);

		case "completed":
			return transfer.status === "completed";

		case "failed":
			return transfer.status === "failed";
	}
}

export function isActiveTransfer(transfer: { status: TransferStatus }) {
	return (
		transfer.status === "connecting" ||
		transfer.status === "transferring" ||
		transfer.status === "paused" ||
		transfer.status === "verifying"
	);
}

export function formatBytes(bytes: number) {
	if (!Number.isFinite(bytes) || bytes <= 0) {
		return "0 B";
	}

	const units = ["B", "KB", "MB", "GB", "TB"];
	const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);

	const value = bytes / 1024 ** unitIndex;

	return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export function formatRelativeTime(timestamp: number) {
	const elapsedMs = Date.now() - timestamp;
	if (!Number.isFinite(elapsedMs) || elapsedMs < 60_000) return "Just now";
	const minutes = Math.floor(elapsedMs / 60_000);
	if (minutes < 60) return `${minutes} minutes ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours} hours ago`;
	const days = Math.floor(hours / 24);
	return days === 1 ? "Yesterday" : `${days} days ago`;
}

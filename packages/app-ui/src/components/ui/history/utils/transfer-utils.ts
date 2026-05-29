import { ACTIVE_STATES, PAUSABLE_STATES, TERMINAL_STATES } from "../constants";
import { MB } from "../data/transfer-demo";
import type { ActiveTransferView, TransferDeliveryState } from "../../transfer-model";
import type { HistoryTransferFilter } from "../types";

export function matchTransferFilter(transfer: ActiveTransferView, filter: HistoryTransferFilter) {
	if (filter === "all") return true;
	if (filter === "active") return ACTIVE_STATES.has(transfer.state);
	if (filter === "failed") return transfer.state === "failed";

	return true;
}

export function matchTransferSearch(transfer: ActiveTransferView, query: string) {
	const normalizedQuery = query.trim().toLowerCase();

	if (!normalizedQuery) return true;

	const searchableText = [
		transfer.title,
		...transfer.targets.flatMap((target) => [
			target.name,
			target.deviceName,
			target.route.type,
			target.route.protocol,
		]),
		transfer.state,
		transfer.direction,
		transfer.encrypted ? "encrypted เข้ารหัส" : "encryption off ไม่เข้ารหัส",
		transfer.kind,
	]
		.filter(Boolean)
		.join(" ")
		.toLowerCase();

	return searchableText.includes(normalizedQuery);
}

export function copyTransfersInfo(transfers: ActiveTransferView[]) {
	void window.navigator.clipboard.writeText(transfers.map(formatTransferInfo).join("\n\n"));
}

function formatTransferInfo(transfer: ActiveTransferView) {
	const routeSummary = Array.from(
		new Set(transfer.targets.map((target) => `${target.route.type}/${target.route.protocol}`)),
	).join(", ");
	const targetSummary = transfer.targets
		.map((target) => `${target.name}${target.deviceName ? ` (${target.deviceName})` : ""}`)
		.join(", ");

	return [
		`Transfer: ${transfer.title}`,
		`State: ${transfer.state}`,
		`Direction: ${transfer.direction}`,
		`Route: ${routeSummary || "unknown/unknown"}`,
		`Encrypted: ${transfer.encrypted ? "Yes" : "No"}`,
		`Targets: ${targetSummary || "unknown"}`,
		`Transfer ID: ${transfer.id}`,
	]
		.filter(Boolean)
		.join("\n");
}

export function aggregateTransferView(transfer: ActiveTransferView): ActiveTransferView {
	const transferredBytes = transfer.targets.reduce(
		(sum, target) => sum + Math.max(0, Math.min(target.transferredBytes, target.totalBytes)),
		0,
	);
	const totalBytes = transfer.targets.reduce((sum, target) => sum + target.totalBytes, 0);
	const speedBps = transfer.targets.reduce((sum, target) => sum + (target.speedBps ?? 0), 0);

	return {
		...transfer,
		state: getStateFromTargets(transfer.targets, transfer.state),
		transferredBytes,
		totalBytes,
		speedBps: speedBps > 0 ? speedBps : undefined,
		etaSeconds: speedBps > 0 ? Math.ceil(Math.max(0, totalBytes - transferredBytes) / speedBps) : undefined,
		error: transfer.error ?? transfer.targets.find((target) => target.error)?.error,
	};
}

function getStateFromTargets(
	targets: ActiveTransferView["targets"],
	fallback: TransferDeliveryState,
): TransferDeliveryState {
	if (targets.length === 0) return fallback;

	const states = targets.map((target) => target.state);
	if (states.every((state) => state === "completed" || state === "skipped")) return "completed";
	if (states.every((state) => state === "cancelled")) return "cancelled";
	if (states.some((state) => state === "transferring")) return "transferring";
	if (states.some((state) => state === "verifying")) return "verifying";
	if (states.some((state) => state === "paused")) return "paused";
	if (states.some((state) => state === "queued")) return "queued";
	if (states.some((state) => state === "failed")) return "failed";
	return fallback;
}

export function defaultSpeedBps(routeType: ActiveTransferView["targets"][number]["route"]["type"]) {
	if (routeType === "lan" || routeType === "direct") return 72 * MB;
	if (routeType === "relay") return 24 * MB;
	return 12 * MB;
}

export function canPauseTransfer(transfer: ActiveTransferView) {
	return PAUSABLE_STATES.has(transfer.state);
}

export function canRemoveTransfer(transfer: ActiveTransferView) {
	return TERMINAL_STATES.has(transfer.state);
}

export function canCancelTransfer(transfer: ActiveTransferView) {
	return !TERMINAL_STATES.has(transfer.state);
}

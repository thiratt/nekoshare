import {
	type ActiveTransferTargetView,
	type ActiveTransferView,
	type TransferConnectionState,
	type TransferDeliveryState,
	type TransferError,
	type TransferRouteType,
} from "../../transfer-model";

export type {
	ActiveTransferTargetView,
	ActiveTransferView,
	TransferConnectionState,
	TransferDeliveryState,
	TransferDirection,
	TransferError,
	TransferProtocol,
	TransferRouteType,
} from "../../transfer-model";

const GB = 1024 ** 3;
export const TRANSFER_TICK_MS = 800;
export const MB = 1024 ** 2;

export function tickActiveTransfers(currentTransfers: ActiveTransferView[]): ActiveTransferView[] {
	let changed = false;
	const nextTransfers = currentTransfers.map((transfer): ActiveTransferView => {
		if (transfer.targets.some((target) => target.connectionState === "connecting")) {
			changed = true;
			return aggregateTransfer({
				...transfer,
				targets: transfer.targets.map((target) =>
					target.connectionState === "connecting" ? { ...target, connectionState: "handshaking" } : target,
				),
			});
		}

		if (transfer.targets.some((target) => target.connectionState === "handshaking")) {
			changed = true;
			return aggregateTransfer({
				...transfer,
				targets: transfer.targets.map((target) =>
					target.connectionState === "handshaking"
						? {
								...target,
								state: target.state === "queued" ? "transferring" : target.state,
								connectionState: "connected",
								speedBps:
									target.speedBps && target.speedBps > 0
										? target.speedBps
										: defaultSpeedBps(target.route.type),
							}
						: target,
				),
			});
		}

		if (transfer.targets.some((target) => target.connectionState === "recovering")) {
			changed = true;
			return aggregateTransfer({
				...transfer,
				targets: transfer.targets.map((target) =>
					target.connectionState === "recovering"
						? {
								...target,
								connectionState: "connected",
								speedBps:
									target.speedBps && target.speedBps > 0
										? target.speedBps
										: defaultSpeedBps(target.route.type),
							}
						: target,
				),
			});
		}

		if (transfer.state === "verifying") {
			changed = true;
			return aggregateTransfer({
				...transfer,
				targets: transfer.targets.map((target) =>
					target.state === "verifying"
						? {
								...target,
								state: "completed",
								transferredBytes: target.totalBytes,
								speedBps: 0,
								etaSeconds: 0,
							}
						: target,
				),
			});
		}

		if (transfer.state !== "transferring") {
			return transfer;
		}

		changed = true;
		return aggregateTransfer({
			...transfer,
			targets: transfer.targets.map((target) => {
				if (target.state !== "transferring") return target;

				const currentSpeed =
					target.speedBps && target.speedBps > 0 ? target.speedBps : defaultSpeedBps(target.route.type);
				const speedJitter = 0.85 + Math.random() * 0.3;
				const nextSpeed = Math.round(currentSpeed * speedJitter);
				const nextTransferredBytes = Math.min(
					target.totalBytes,
					target.transferredBytes + nextSpeed * (TRANSFER_TICK_MS / 1000),
				);

				if (nextTransferredBytes >= target.totalBytes) {
					return {
						...target,
						state: "verifying",
						transferredBytes: target.totalBytes,
						speedBps: 0,
						etaSeconds: 2,
					};
				}

				return {
					...target,
					transferredBytes: nextTransferredBytes,
					speedBps: nextSpeed,
					etaSeconds: Math.ceil((target.totalBytes - nextTransferredBytes) / nextSpeed),
				};
			}),
		});
	});

	return changed ? nextTransfers : currentTransfers;
}

export const mockActiveTransfers: ActiveTransferView[] = [
	aggregateTransfer({
		id: "tr_001",
		title: "rdr2-thai-translation-pack.zip",
		fileCount: 249,
		kind: "folder",
		direction: "send",
		targets: [
			makeTarget(
				"max-phone",
				"Max",
				"Galaxy A55",
				"transferring",
				"connected",
				"lan",
				"tcp",
				1.15 * GB,
				2.7 * GB,
				42 * MB,
			),
			makeTarget(
				"max-laptop",
				"Max Laptop",
				"ThinkPad X1",
				"transferring",
				"connected",
				"lan",
				"tcp",
				0.92 * GB,
				2.7 * GB,
				36 * MB,
			),
			makeTarget(
				"office-pc",
				"Office PC",
				"Windows Desktop",
				"transferring",
				"connected",
				"lan",
				"tcp",
				0.73 * GB,
				2.7 * GB,
				34 * MB,
			),
		],
		encrypted: true,
		state: "transferring",
		transferredBytes: 0,
		totalBytes: 0,
	}),
	aggregateTransfer({
		id: "tr_002",
		title: "graduation-project-demo.mov",
		fileCount: 1,
		kind: "file",
		direction: "receive",
		targets: [
			makeTarget(
				"office-pc",
				"Office PC",
				"Windows Desktop",
				"transferring",
				"connected",
				"relay",
				"websocket",
				640 * MB,
				4.7 * GB,
				18 * MB,
			),
		],
		encrypted: true,
		state: "transferring",
		transferredBytes: 0,
		totalBytes: 0,
	}),
	aggregateTransfer({
		id: "tr_003",
		title: "client-assets",
		fileCount: 1284,
		kind: "folder",
		direction: "send",
		targets: [
			makeTarget(
				"web-chrome",
				"Guest Web",
				"Chrome",
				"transferring",
				"recovering",
				"relay",
				"websocket",
				0.74 * GB,
				2.5 * GB,
				0,
			),
			makeTarget(
				"web-edge",
				"Preview Link",
				"Microsoft Edge",
				"transferring",
				"connected",
				"relay",
				"websocket",
				0.46 * GB,
				2.5 * GB,
				0,
			),
		],
		encrypted: true,
		state: "transferring",
		transferredBytes: 0,
		totalBytes: 0,
	}),
	aggregateTransfer({
		id: "tr_004",
		title: "backup-photos.zip",
		fileCount: 1,
		kind: "file",
		direction: "receive",
		targets: [
			makeTarget(
				"max-laptop",
				"Max Laptop",
				"Neko Share Desktop",
				"paused",
				"disconnected",
				"lan",
				"tcp",
				820 * MB,
				2.4 * GB,
				0,
			),
		],
		encrypted: false,
		state: "paused",
		transferredBytes: 0,
		totalBytes: 0,
	}),
	aggregateTransfer({
		id: "tr_005",
		title: "final-build.tar.zst",
		fileCount: 1,
		kind: "file",
		direction: "send",
		targets: [
			makeTarget(
				"dev-server",
				"Dev Server",
				"Ubuntu VPS",
				"completed",
				"disconnected",
				"relay",
				"websocket",
				1.6 * GB,
				1.6 * GB,
				0,
			),
		],
		encrypted: true,
		state: "completed",
		transferredBytes: 0,
		totalBytes: 0,
	}),
	aggregateTransfer({
		id: "tr_006",
		title: "video-cache",
		fileCount: 84,
		kind: "folder",
		direction: "send",
		targets: [
			makeTarget(
				"friend-pc",
				"Friend PC",
				"Windows",
				"failed",
				"failed",
				"unknown",
				"unknown",
				312 * MB,
				3.2 * GB,
				0,
				{
					code: "peer_disconnected",
					message: "Connection lost. The receiver went offline before resume data was saved.",
					retryable: true,
				},
			),
		],
		encrypted: true,
		state: "failed",
		transferredBytes: 0,
		totalBytes: 0,
		error: {
			code: "peer_disconnected",
			message: "Connection lost. The receiver went offline before resume data was saved.",
			retryable: true,
		},
	}),
	aggregateTransfer({
		id: "tr_007",
		title: "family-album-2026",
		fileCount: 312,
		kind: "folder",
		direction: "receive",
		targets: [makeTarget("mom-ipad", "Mom iPad", "iPad Air", "queued", "connecting", "lan", "tcp", 0, 6.4 * GB, 0)],
		encrypted: true,
		state: "queued",
		transferredBytes: 0,
		totalBytes: 0,
	}),
	aggregateTransfer({
		id: "tr_008",
		title: "portfolio-export.zip",
		fileCount: 48,
		kind: "folder",
		direction: "send",
		targets: [
			makeTarget(
				"mina-mba",
				"Mina",
				"MacBook Air",
				"verifying",
				"connected",
				"relay",
				"websocket",
				0.64 * GB,
				0.64 * GB,
				0,
			),
			makeTarget(
				"mina-ipad",
				"Mina iPad",
				"iPad Pro",
				"completed",
				"disconnected",
				"relay",
				"websocket",
				0.63 * GB,
				0.63 * GB,
				0,
			),
			makeTarget(
				"mina-phone",
				"Mina Phone",
				"iPhone 16",
				"completed",
				"disconnected",
				"relay",
				"websocket",
				0.63 * GB,
				0.63 * GB,
				0,
			),
		],
		encrypted: true,
		state: "verifying",
		transferredBytes: 0,
		totalBytes: 0,
	}),
	aggregateTransfer({
		id: "tr_009",
		title: "large-dataset.parquet",
		fileCount: 1,
		kind: "file",
		direction: "send",
		targets: [
			makeTarget(
				"research-pc",
				"Research PC",
				"Linux Desktop",
				"cancelled",
				"disconnected",
				"unknown",
				"unknown",
				410 * MB,
				12 * GB,
				0,
				{
					code: "cancelled",
					message: "Transfer cancelled by user.",
					retryable: true,
				},
			),
		],
		encrypted: true,
		state: "cancelled",
		transferredBytes: 0,
		totalBytes: 0,
		error: {
			code: "cancelled",
			message: "Transfer cancelled by user.",
			retryable: true,
		},
	}),
	aggregateTransfer({
		id: "tr_010",
		title: "contract-scan.pdf",
		fileCount: 1,
		kind: "file",
		direction: "send",
		targets: [
			makeTarget(
				"guest-web",
				"Guest Web",
				"Safari",
				"queued",
				"handshaking",
				"relay",
				"websocket",
				0,
				18 * MB,
				0,
			),
		],
		encrypted: true,
		state: "queued",
		transferredBytes: 0,
		totalBytes: 0,
	}),
];

function makeTarget(
	id: string,
	name: string,
	deviceName: string | undefined,
	state: TransferDeliveryState,
	connectionState: TransferConnectionState,
	routeType: TransferRouteType,
	protocol: ActiveTransferTargetView["route"]["protocol"],
	transferredBytes: number,
	totalBytes: number,
	speedBps: number,
	error?: TransferError,
): ActiveTransferTargetView {
	return {
		id,
		name,
		deviceName,
		state,
		connectionState,
		route: {
			type: routeType,
			protocol,
		},
		transferredBytes,
		totalBytes,
		speedBps: speedBps > 0 ? speedBps : undefined,
		etaSeconds: speedBps > 0 ? Math.ceil(Math.max(0, totalBytes - transferredBytes) / speedBps) : undefined,
		error,
	};
}

function aggregateTransfer(transfer: ActiveTransferView): ActiveTransferView {
	const transferredBytes = transfer.targets.reduce(
		(sum, target) => sum + Math.max(0, Math.min(target.transferredBytes, target.totalBytes)),
		0,
	);
	const totalBytes = transfer.targets.reduce((sum, target) => sum + target.totalBytes, 0);
	const speedBps = transfer.targets.reduce((sum, target) => sum + (target.speedBps ?? 0), 0);
	const state = getStateFromTargets(transfer.targets, transfer.state);

	return {
		...transfer,
		state,
		transferredBytes,
		totalBytes,
		speedBps: speedBps > 0 ? speedBps : undefined,
		etaSeconds: speedBps > 0 ? Math.ceil(Math.max(0, totalBytes - transferredBytes) / speedBps) : undefined,
		error: transfer.error ?? transfer.targets.find((target) => target.error)?.error,
	};
}

function getStateFromTargets(
	targets: ActiveTransferTargetView[],
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

function defaultSpeedBps(routeType: TransferRouteType) {
	if (routeType === "lan" || routeType === "direct") return 72 * MB;
	if (routeType === "relay") return 24 * MB;
	return 12 * MB;
}

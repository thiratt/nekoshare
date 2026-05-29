export type TransferDirection = "send" | "receive";

export type TransferRouteType = "lan" | "relay" | "direct" | "unknown";
export type TransferProtocol = "tcp" | "websocket" | "webrtc" | "unknown";

export type TransferConnectionState =
	| "idle"
	| "listening"
	| "connecting"
	| "handshaking"
	| "connected"
	| "recovering"
	| "disconnected"
	| "failed";

export type TransferDeliveryState =
	| "queued"
	| "transferring"
	| "paused"
	| "verifying"
	| "completed"
	| "failed"
	| "cancelled"
	| "skipped";

export type TransferError = {
	code:
		| "network_error"
		| "peer_disconnected"
		| "permission_denied"
		| "disk_full"
		| "file_missing"
		| "checksum_mismatch"
		| "cancelled"
		| "unknown";
	message: string;
	retryable: boolean;
};

export type TransferSession = {
	id: string;
	title: string;
	direction: TransferDirection;
	kind: "file" | "folder" | "mixed";
	fileIds: string[];
	recipientIds: string[];
	encrypted: boolean;
	state: TransferDeliveryState;
	createdAt: number;
	updatedAt: number;
	error?: TransferError;
};

export type TransferFile = {
	id: string;
	sessionId: string;
	name: string;
	relativePath: string;
	size: number;
	chunkSize: number;
	chunkCount: number;
	hash?: string;
};

export type TransferRecipient = {
	id: string;
	sessionId: string;
	name: string;
	deviceName?: string;
	kind: "own-device" | "friend" | "web" | "unknown";
};

export type TransferConnection = {
	id: string;
	sessionId: string;
	recipientId: string;
	state: TransferConnectionState;
	route: {
		type: TransferRouteType;
		protocol: TransferProtocol;
	};
	speedBps?: number;
	latencyMs?: number;
	lastError?: TransferError;
};

export type RecipientFileTransfer = {
	id: string;
	sessionId: string;
	recipientId: string;
	fileId: string;
	state: TransferDeliveryState;
	transferredBytes: number;
	totalBytes: number;
	completedChunks: number[];
	startedAt?: number;
	completedAt?: number;
	error?: TransferError;
};

export type ActiveTransferTargetView = {
	id: string;
	name: string;
	deviceName?: string;
	state: TransferDeliveryState;
	connectionState: TransferConnectionState;
	route: {
		type: TransferRouteType;
		protocol: TransferProtocol;
	};
	transferredBytes: number;
	totalBytes: number;
	speedBps?: number;
	etaSeconds?: number;
	error?: TransferError;
};

export type ActiveTransferView = {
	id: string;
	title: string;
	kind: "file" | "folder" | "mixed";
	fileCount: number;
	direction: TransferDirection;
	state: TransferDeliveryState;
	encrypted: boolean;
	transferredBytes: number;
	totalBytes: number;
	speedBps?: number;
	etaSeconds?: number;
	targets: ActiveTransferTargetView[];
	error?: TransferError;
};

export type TransferDomainSnapshot = {
	sessions: TransferSession[];
	files: TransferFile[];
	recipients: TransferRecipient[];
	connections: TransferConnection[];
	recipientFileTransfers: RecipientFileTransfer[];
};

export function getTransferProgress(transfer: Pick<ActiveTransferView, "transferredBytes" | "totalBytes">): number {
	return getProgressPercent(transfer.transferredBytes, transfer.totalBytes);
}

export function getTargetProgress(target: Pick<ActiveTransferTargetView, "transferredBytes" | "totalBytes">): number {
	return getProgressPercent(target.transferredBytes, target.totalBytes);
}

export function getProgressPercent(transferredBytes: number, totalBytes: number): number {
	if (!Number.isFinite(totalBytes) || totalBytes <= 0) return 0;
	return Math.max(0, Math.min(100, (Math.max(0, transferredBytes) / totalBytes) * 100));
}

export function getSessionStateFromDeliveries(
	deliveries: Array<Pick<RecipientFileTransfer, "state">>,
	fallback: TransferDeliveryState = "queued",
): TransferDeliveryState {
	if (deliveries.length === 0) return fallback;

	const states = deliveries.map((delivery) => delivery.state);
	if (states.every((state) => state === "completed" || state === "skipped")) return "completed";
	if (states.every((state) => state === "cancelled")) return "cancelled";
	if (states.some((state) => state === "transferring")) return "transferring";
	if (states.some((state) => state === "verifying")) return "verifying";
	if (states.some((state) => state === "paused")) return "paused";
	if (states.some((state) => state === "queued")) return "queued";
	if (states.some((state) => state === "failed")) return "failed";
	return fallback;
}

export function deriveActiveTransferViews(input: TransferDomainSnapshot): ActiveTransferView[] {
	return input.sessions.map((session) => {
		const sessionFiles = input.files.filter((file) => file.sessionId === session.id);
		const sessionRecipients = input.recipients.filter((recipient) => recipient.sessionId === session.id);
		const sessionDeliveries = input.recipientFileTransfers.filter((delivery) => delivery.sessionId === session.id);
		const targets = sessionRecipients.map((recipient): ActiveTransferTargetView => {
			const deliveries = sessionDeliveries.filter((delivery) => delivery.recipientId === recipient.id);
			const connection = input.connections.find(
				(item) => item.sessionId === session.id && item.recipientId === recipient.id,
			);
			const transferredBytes = deliveries.reduce(
				(sum, delivery) => sum + Math.max(0, Math.min(delivery.transferredBytes, delivery.totalBytes)),
				0,
			);
			const totalBytes = deliveries.reduce((sum, delivery) => sum + delivery.totalBytes, 0);
			const speedBps = connection?.speedBps;

			return {
				id: recipient.id,
				name: recipient.name,
				deviceName: recipient.deviceName,
				state: getSessionStateFromDeliveries(deliveries, session.state),
				connectionState: connection?.state ?? "idle",
				route: connection?.route ?? { type: "unknown", protocol: "unknown" },
				transferredBytes,
				totalBytes,
				speedBps,
				etaSeconds:
					speedBps && speedBps > 0
						? Math.ceil(Math.max(0, totalBytes - transferredBytes) / speedBps)
						: undefined,
				error: deliveries.find((delivery) => delivery.error)?.error ?? connection?.lastError,
			};
		});
		const transferredBytes = targets.reduce((sum, target) => sum + target.transferredBytes, 0);
		const totalBytes = targets.reduce((sum, target) => sum + target.totalBytes, 0);
		const speedBps = targets.reduce((sum, target) => sum + (target.speedBps ?? 0), 0);

		return {
			id: session.id,
			title: session.title,
			kind: session.kind,
			fileCount: sessionFiles.length,
			direction: session.direction,
			state: getSessionStateFromDeliveries(sessionDeliveries, session.state),
			encrypted: session.encrypted,
			transferredBytes,
			totalBytes,
			speedBps: speedBps > 0 ? speedBps : undefined,
			etaSeconds: speedBps > 0 ? Math.ceil(Math.max(0, totalBytes - transferredBytes) / speedBps) : undefined,
			targets,
			error: session.error ?? targets.find((target) => target.error)?.error,
		};
	});
}

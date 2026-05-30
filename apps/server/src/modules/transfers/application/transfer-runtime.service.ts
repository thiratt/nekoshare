import { randomUUID } from "node:crypto";

import type {
	TransferFileMetadata,
	TransferProgress,
	TransferRuntime,
	TransferRuntimeEvent,
	TransferStatus,
	TransferTransportMode,
	TransferTransportState,
} from "../transfer.types";
import type { TransferRuntimeStore } from "../transfer-runtime-store";

export interface TransferRuntimeServiceDependencies {
	runtimeStore?: TransferRuntimeStore;
	onRuntimeError?: (operation: string, error: unknown) => void;
}

export function nowIso(): string {
	return new Date().toISOString();
}

export function createRuntimeEvent(
	transferId: string,
	type: TransferRuntimeEvent["type"],
	input: Omit<TransferRuntimeEvent, "id" | "transferId" | "type" | "createdAt"> = {},
): TransferRuntimeEvent {
	return {
		id: randomUUID(),
		transferId,
		type,
		...input,
		createdAt: nowIso(),
	};
}

export function getTotalBytes(files: TransferFileMetadata[]): number {
	return files.reduce((total, file) => total + file.size, 0);
}

export function createInitialProgress(files: TransferFileMetadata[]): TransferProgress {
	return {
		totalBytes: getTotalBytes(files),
		bytesSent: 0,
		bytesReceived: 0,
		bytesAcknowledged: 0,
		fileCount: files.length,
		filesCompleted: 0,
		updatedAt: nowIso(),
	};
}

function parseAckProgress(ackJson: string): Partial<TransferProgress> | undefined {
	let parsed: unknown;
	try {
		parsed = JSON.parse(ackJson);
	} catch {
		return undefined;
	}

	if (!parsed || typeof parsed !== "object") {
		return undefined;
	}

	const record = parsed as Record<string, unknown>;
	const progress: Partial<TransferProgress> = {};
	for (const key of ["totalBytes", "bytesSent", "bytesReceived", "bytesAcknowledged", "filesCompleted"] as const) {
		const value = record[key];
		if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
			progress[key] = value;
		}
	}

	return Object.keys(progress).length > 0 ? progress : undefined;
}

export function createTransferRuntimeService(deps: TransferRuntimeServiceDependencies) {
	async function safeRuntimeWrite(operation: string, write: () => Promise<void>): Promise<void> {
		if (!deps.runtimeStore) {
			return;
		}

		try {
			await write();
		} catch (error) {
			deps.onRuntimeError?.(operation, error);
		}
	}

	async function updateRuntimeStatus(
		transferId: string,
		status: TransferStatus,
		transport?: TransferTransportMode,
		transportState?: TransferTransportState,
		message?: string,
	): Promise<void> {
		await safeRuntimeWrite("update runtime status", async () => {
			const runtime = await deps.runtimeStore!.getRuntime(transferId);
			if (runtime) {
				const updated: TransferRuntime = {
					...runtime,
					status,
					transport: transport ?? runtime.transport,
					transportState: transportState ?? runtime.transportState,
					updatedAt: nowIso(),
				};
				await deps.runtimeStore!.saveRuntime(updated);
				await deps.runtimeStore!.saveProgress(transferId, updated.progress);
			}

			await deps.runtimeStore!.addEvent(
				createRuntimeEvent(transferId, "status-changed", { status, transport, transportState, message }),
			);
		});
	}

	return {
		safeRuntimeWrite,
		updateRuntimeStatus,

		async saveOfferRuntime(transferId: string, runtime: TransferRuntime): Promise<void> {
			await safeRuntimeWrite("create transfer runtime", async () => {
				await deps.runtimeStore!.saveRuntime(runtime);
				await deps.runtimeStore!.saveProgress(transferId, runtime.progress);
				await deps.runtimeStore!.addEvent(
					createRuntimeEvent(transferId, "status-changed", {
						status: "offered",
						transport: "unknown",
						transportState: "none",
					}),
				);
			});
		},

		async markRelayPeersConnected(transferId: string): Promise<void> {
			await updateRuntimeStatus(transferId, "transferring", "relay", "connected", "Relay peers connected");
		},

		async markRelayPeerDisconnected(transferId: string): Promise<void> {
			await updateRuntimeStatus(transferId, "paused", "relay", "waiting-peer", "Relay peer disconnected");
		},

		async recordRelayProgress(transferId: string, bytesRelayed: number): Promise<void> {
			await safeRuntimeWrite("record relay progress", async () => {
				const runtime = await deps.runtimeStore!.getRuntime(transferId);
				if (!runtime) {
					return;
				}

				const updatedProgress: TransferProgress = {
					...runtime.progress,
					bytesSent: bytesRelayed,
					bytesReceived: bytesRelayed,
					updatedAt: nowIso(),
				};

				await deps.runtimeStore!.saveProgress(transferId, updatedProgress);
				await deps.runtimeStore!.saveRuntime({
					...runtime,
					progress: updatedProgress,
					updatedAt: updatedProgress.updatedAt,
				});
				await deps.runtimeStore!.addEvent(
					createRuntimeEvent(transferId, "progress-updated", {
						progress: updatedProgress,
						message: "Relay bytes forwarded",
					}),
				);
			});
		},

		async recordFileAckProgress(transferId: string, ackJson: string): Promise<void> {
			await safeRuntimeWrite("record FILE_ACK runtime event", async () => {
				const runtime = await deps.runtimeStore!.getRuntime(transferId);
				const ackProgress = parseAckProgress(ackJson);
				const progress = runtime?.progress;
				const updatedProgress =
					progress && ackProgress
						? {
								...progress,
								...ackProgress,
								updatedAt: nowIso(),
							}
						: progress;

				if (updatedProgress) {
					await deps.runtimeStore!.saveProgress(transferId, updatedProgress);
					if (runtime) {
						await deps.runtimeStore!.saveRuntime({
							...runtime,
							progress: updatedProgress,
							updatedAt: updatedProgress.updatedAt,
						});
					}
				}

				await deps.runtimeStore!.addEvent(
					createRuntimeEvent(transferId, "progress-updated", {
						progress: updatedProgress,
						message: "FILE_ACK received",
					}),
				);
			});
		},
	};
}

export type TransferRuntimeService = ReturnType<typeof createTransferRuntimeService>;

import { randomUUID } from "node:crypto";

import type {
	TransferFileMetadata,
	TransferProgress,
	TransferRuntime,
	TransferRuntimeEvent,
	TransferSessionRecord,
	TransferStatus,
	TransferTransportMode,
	TransferTransportState,
} from "./transfer.types";
import type { TransferRuntimeStore } from "./transfer-runtime-store";

interface FileOfferInput {
	transferId?: string;
	fromDeviceId?: string;
	toDeviceId?: string;
	files?: {
		name: string;
		size: number;
		extension: string;
	}[];
}

interface FileAcceptInput {
	transferId?: string;
	senderDeviceId?: string;
	address?: string;
	port?: number;
}

interface FileRejectInput {
	transferId?: string;
	senderDeviceId?: string;
	receiverDeviceId?: string;
	reason?: string;
}

interface SenderDevice {
	id: string;
	fingerprint: string | null;
	deviceName: string;
	userId: string;
}

interface UserSummary {
	id: string;
	name: string;
}

interface DeviceFingerprint {
	fingerprint: string | null;
}

export interface TransferDeviceLookup {
	findSenderDevice(deviceId: string): Promise<SenderDevice | null | undefined>;
	findUserSummary(userId: string): Promise<UserSummary | null | undefined>;
	findDeviceFingerprint(deviceId: string): Promise<DeviceFingerprint | null | undefined>;
}

export interface TransferLifecycle {
	registerTransferOffer(
		transferId: string,
		senderDeviceId: string,
		receiverDeviceId: string,
	): Promise<{ ok: true } | { ok: false; reason: string }>;
	ensureTransferParticipants(
		transferId: string,
		senderDeviceId: string,
		receiverDeviceId: string,
	): Promise<TransferSessionRecord | undefined>;
	markTransferAccepted(transferId: string): Promise<void>;
	removeTransferSession(transferId: string): Promise<void>;
	resolveTransferForAck(
		senderDeviceId: string,
		targetDeviceId: string,
		ackJson: string,
	): Promise<TransferSessionRecord | undefined>;
	getTransferSessionForFallback(transferId: string): Promise<TransferSessionRecord | undefined>;
}

export interface TransferServiceDependencies {
	devices: TransferDeviceLookup;
	lifecycle: TransferLifecycle;
	runtimeStore?: TransferRuntimeStore;
	onRuntimeError?: (operation: string, error: unknown) => void;
}

export interface PreparedFileOffer {
	transferId: string;
	targetDeviceId: string;
	senderDeviceId: string;
	senderDevice: SenderDevice;
	senderUser: UserSummary | null | undefined;
	files: NonNullable<FileOfferInput["files"]>;
	spoofedFromDeviceId?: string;
}

export interface PreparedFileAccept {
	transferId: string;
	senderDeviceId: string;
	receiverDeviceId: string;
	address: string;
	port: number;
	transferSession: TransferSessionRecord;
}

function nowIso(): string {
	return new Date().toISOString();
}

function createRuntimeEvent(
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

function toRuntimeFiles(files: NonNullable<FileOfferInput["files"]>): TransferFileMetadata[] {
	return files.map((file) => ({
		name: file.name,
		size: file.size,
		extension: file.extension,
	}));
}

export function createRuntimeFromOffer(offer: PreparedFileOffer): TransferRuntime {
	const now = nowIso();
	const files = toRuntimeFiles(offer.files);
	return {
		transferId: offer.transferId,
		status: "offered",
		requestedTransport: "auto",
		transport: "unknown",
		transportState: "none",
		sender: {
			role: "sender",
			userId: offer.senderDevice.userId,
			deviceId: offer.senderDeviceId,
			deviceName: offer.senderDevice.deviceName,
			deviceFingerprint: offer.senderDevice.fingerprint,
		},
		receiver: {
			role: "receiver",
			userId: "",
			deviceId: offer.targetDeviceId,
			deviceName: null,
			deviceFingerprint: null,
		},
		files,
		progress: createInitialProgress(files),
		createdAt: now,
		updatedAt: now,
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

export function createTransferService(deps: TransferServiceDependencies) {
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
		async prepareFileOffer(
			payload: FileOfferInput,
			senderDeviceId: string | undefined,
		): Promise<PreparedFileOffer> {
			const transferId = payload.transferId?.trim();
			const targetDeviceId = payload.toDeviceId?.trim();
			if (!transferId || !targetDeviceId || !Array.isArray(payload.files) || payload.files.length === 0) {
				throw new Error("Invalid FILE_OFFER payload");
			}

			if (!senderDeviceId) {
				throw new Error("Unauthorized sender device");
			}

			if (senderDeviceId === targetDeviceId) {
				throw new Error("Cannot transfer files to the same device");
			}

			const senderDevice = await deps.devices.findSenderDevice(senderDeviceId);
			if (!senderDevice) {
				throw new Error(`Sender device ${senderDeviceId} not found in database`);
			}

			const senderUser = await deps.devices.findUserSummary(senderDevice.userId);
			const spoofedFromDeviceId =
				payload.fromDeviceId && payload.fromDeviceId !== senderDeviceId ? payload.fromDeviceId : undefined;

			return {
				transferId,
				targetDeviceId,
				senderDeviceId,
				senderDevice,
				senderUser,
				files: payload.files,
				spoofedFromDeviceId,
			};
		},

		getFileOfferTargetUnavailablePayload(offer: PreparedFileOffer) {
			return {
				transferId: offer.transferId,
				senderDeviceId: offer.senderDeviceId,
				reason: "Target device is not connected",
			};
		},

		async createFileOfferForwardPayload(offer: PreparedFileOffer) {
			const registrationResult = await deps.lifecycle.registerTransferOffer(
				offer.transferId,
				offer.senderDeviceId,
				offer.targetDeviceId,
			);
			if (!registrationResult.ok) {
				throw new Error(registrationResult.reason);
			}

			const runtime = createRuntimeFromOffer(offer);
			await safeRuntimeWrite("create transfer runtime", async () => {
				await deps.runtimeStore!.saveRuntime(runtime);
				await deps.runtimeStore!.saveProgress(offer.transferId, runtime.progress);
				await deps.runtimeStore!.addEvent(
					createRuntimeEvent(offer.transferId, "status-changed", {
						status: "offered",
						transport: "unknown",
						transportState: "none",
					}),
				);
			});

			return {
				transferId: offer.transferId,
				senderDeviceId: offer.senderDeviceId,
				senderDeviceFingerprint: offer.senderDevice.fingerprint,
				senderDeviceName: offer.senderDevice.deviceName,
				senderUserId: offer.senderUser?.id ?? null,
				senderUserName: offer.senderUser?.name ?? null,
				files: offer.files,
			};
		},

		getFileOfferUnreachablePayload(offer: PreparedFileOffer) {
			return {
				transferId: offer.transferId,
				senderDeviceId: offer.senderDeviceId,
				reason: "Target device is unreachable",
			};
		},

		async prepareFileAccept(
			payload: FileAcceptInput,
			receiverDeviceId: string | undefined,
		): Promise<PreparedFileAccept> {
			const transferId = payload.transferId?.trim();
			const senderDeviceId = payload.senderDeviceId?.trim();
			if (
				!transferId ||
				!senderDeviceId ||
				typeof payload.address !== "string" ||
				typeof payload.port !== "number"
			) {
				throw new Error("Invalid FILE_ACCEPT payload");
			}

			if (payload.port < 1 || payload.port > 65535) {
				throw new Error("Invalid FILE_ACCEPT port");
			}

			if (!receiverDeviceId) {
				throw new Error("Could not determine receiver device ID from connection");
			}

			const transferSession = await deps.lifecycle.ensureTransferParticipants(
				transferId,
				senderDeviceId,
				receiverDeviceId,
			);
			if (!transferSession) {
				throw new Error("FILE_ACCEPT does not match an active transfer session");
			}

			return {
				transferId,
				senderDeviceId,
				receiverDeviceId,
				address: payload.address,
				port: payload.port,
				transferSession,
			};
		},

		async createFileAcceptForwardPayload(accept: PreparedFileAccept) {
			const receiverDevice = await deps.devices.findDeviceFingerprint(accept.receiverDeviceId);
			if (!receiverDevice) {
				throw new Error(`Receiver device ${accept.receiverDeviceId} not found in database`);
			}

			await deps.lifecycle.markTransferAccepted(accept.transferSession.transferId);
			await updateRuntimeStatus(
				accept.transferId,
				"accepted",
				"lan-direct",
				"listener-ready",
				"FILE_ACCEPT received",
			);

			return {
				transferId: accept.transferId,
				senderDeviceId: accept.senderDeviceId,
				receiverDeviceId: accept.receiverDeviceId,
				receiverFingerprint: receiverDevice.fingerprint,
				address: accept.address,
				port: accept.port,
			};
		},

		async createFileRejectForwardPayload(payload: FileRejectInput, rejectorDeviceId: string | undefined) {
			const transferId = payload.transferId?.trim();
			if (!transferId) {
				throw new Error("Invalid FILE_REJECT payload");
			}

			if (!rejectorDeviceId) {
				throw new Error("Unauthorized rejector device");
			}

			const fallbackSession = await deps.lifecycle.getTransferSessionForFallback(transferId);
			const senderDeviceId =
				payload.senderDeviceId?.trim() || payload.receiverDeviceId?.trim() || fallbackSession?.senderDeviceId;

			if (!senderDeviceId) {
				throw new Error("Missing sender device for FILE_REJECT");
			}

			const transferSession = await deps.lifecycle.ensureTransferParticipants(
				transferId,
				senderDeviceId,
				rejectorDeviceId,
			);
			if (!transferSession) {
				throw new Error("FILE_REJECT does not match an active transfer session");
			}

			await updateRuntimeStatus(
				transferId,
				"rejected",
				undefined,
				undefined,
				payload.reason ?? "Transfer rejected by receiver",
			);
			await deps.lifecycle.removeTransferSession(transferId);

			return {
				targetDeviceId: senderDeviceId,
				payload: {
					transferId,
					senderDeviceId,
					reason: payload.reason ?? "Transfer rejected by receiver",
				},
			};
		},

		async resolveFileAck(senderDeviceId: string | undefined, targetDeviceId: string, ackJson: string) {
			if (!targetDeviceId) {
				throw new Error("Invalid FILE_ACK target device");
			}

			if (!senderDeviceId) {
				throw new Error("Unauthorized ACK sender");
			}

			const transferSession = await deps.lifecycle.resolveTransferForAck(senderDeviceId, targetDeviceId, ackJson);
			if (!transferSession) {
				throw new Error("FILE_ACK does not match an accepted transfer session");
			}

			await safeRuntimeWrite("record FILE_ACK runtime event", async () => {
				const runtime = await deps.runtimeStore!.getRuntime(transferSession.transferId);
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
					await deps.runtimeStore!.saveProgress(transferSession.transferId, updatedProgress);
					if (runtime) {
						await deps.runtimeStore!.saveRuntime({
							...runtime,
							progress: updatedProgress,
							updatedAt: updatedProgress.updatedAt,
						});
					}
				}

				await deps.runtimeStore!.addEvent(
					createRuntimeEvent(transferSession.transferId, "progress-updated", {
						progress: updatedProgress,
						message: "FILE_ACK received",
					}),
				);
			});

			return {
				senderDeviceId,
				targetDeviceId,
				transferSession,
			};
		},
	};
}

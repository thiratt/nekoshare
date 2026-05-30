import { createInitialProgress, nowIso, type TransferRuntimeService } from "./transfer-runtime.service";
import type {
	PreparedFileAccept,
	PreparedFileOffer,
	TransferDeviceLookup,
	TransferLifecycle,
} from "../transfer.service";
import type { TransferFileMetadata, TransferRuntime } from "../transfer.types";

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

export interface TransferLifecycleServiceDependencies {
	devices: TransferDeviceLookup;
	lifecycle: TransferLifecycle;
	runtime: TransferRuntimeService;
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
			userId: offer.targetDevice.userId,
			deviceId: offer.targetDevice.id,
			deviceName: offer.targetDevice.deviceName,
			deviceFingerprint: offer.targetDevice.fingerprint,
		},
		files,
		progress: createInitialProgress(files),
		createdAt: now,
		updatedAt: now,
	};
}

export function createTransferLifecycleService(deps: TransferLifecycleServiceDependencies) {
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

			const targetDevice = await deps.devices.findTargetDevice(targetDeviceId);
			if (!targetDevice) {
				throw new Error(`Target device ${targetDeviceId} not found in database`);
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
				targetDevice,
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
			await deps.runtime.saveOfferRuntime(offer.transferId, runtime);

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
			await deps.runtime.updateRuntimeStatus(
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

			await deps.runtime.updateRuntimeStatus(
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

			await deps.runtime.recordFileAckProgress(transferSession.transferId, ackJson);

			return {
				senderDeviceId,
				targetDeviceId,
				transferSession,
			};
		},
	};
}

export type TransferLifecycleService = ReturnType<typeof createTransferLifecycleService>;

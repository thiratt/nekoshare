import type { TransferSessionRecord } from "./transfer.types";

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
}

interface PreparedFileOffer {
	transferId: string;
	targetDeviceId: string;
	senderDeviceId: string;
	senderDevice: SenderDevice;
	senderUser: UserSummary | null | undefined;
	files: NonNullable<FileOfferInput["files"]>;
	spoofedFromDeviceId?: string;
}

interface PreparedFileAccept {
	transferId: string;
	senderDeviceId: string;
	receiverDeviceId: string;
	address: string;
	port: number;
	transferSession: TransferSessionRecord;
}

export function createTransferService(deps: TransferServiceDependencies) {
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

			return {
				senderDeviceId,
				targetDeviceId,
				transferSession,
			};
		},
	};
}

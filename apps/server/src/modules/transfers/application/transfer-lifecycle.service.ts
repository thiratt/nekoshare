import { createInitialProgress, nowIso, type TransferRuntimeService } from "./transfer-runtime.service";
import type {
	PreparedFileAccept,
	PreparedFileOffer,
	TransferDeviceLookup,
	TransferLifecycle,
} from "../transfer.service";
import type { TransferFileMetadata, TransferRuntime } from "../transfer.types";
import type { protocol } from "@workspace/contracts";

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

interface TransferAcceptLegacyContext {
	authenticatedReceiverDeviceId: string | undefined;
	senderDeviceId?: string;
	address?: string;
	port?: number;
}

interface TransferRejectLegacyContext {
	rejectorDeviceId: string | undefined;
	senderDeviceId?: string;
	receiverDeviceId?: string;
}

interface TransferOfferLegacyContext {
	files?: PreparedFileOffer["files"];
}

export interface TransferLifecycleServiceDependencies {
	devices: TransferDeviceLookup;
	lifecycle: TransferLifecycle;
	runtime: TransferRuntimeService;
}

function toRuntimeFiles(files: PreparedFileOffer["files"]): TransferFileMetadata[] {
	return files.map((file) => ({
		name: file.name,
		size: file.size,
		extension: file.extension,
	}));
}

function getCommandFileExtension(item: protocol.TransferFileManifestItem): string {
	const extension = item.name.includes(".") ? item.name.split(".").pop() : undefined;
	return extension || "";
}

function toPreparedOfferFiles(manifest: protocol.TransferManifest): PreparedFileOffer["files"] {
	return manifest.items
		.filter((item): item is protocol.TransferFileManifestItem => item.kind === "file")
		.map((item) => ({
			name: item.name,
			size: item.size,
			extension: getCommandFileExtension(item),
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
	async function prepareTransferOffer(
		command: protocol.TransferOfferCommandPayload,
		senderDeviceId: string | undefined,
		context: TransferOfferLegacyContext = {},
	): Promise<PreparedFileOffer> {
		const transferId = command.transferId?.trim();
		const targetDeviceId = command.receiverDeviceId?.trim();
		const files = context.files ?? toPreparedOfferFiles(command.manifest);
		if (!transferId || !targetDeviceId || files.length === 0) {
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
			command.senderDeviceId && command.senderDeviceId !== senderDeviceId ? command.senderDeviceId : undefined;

		return {
			transferId,
			targetDeviceId,
			senderDeviceId,
			senderDevice,
			senderUser,
			targetDevice,
			files,
			spoofedFromDeviceId,
		};
	}

	async function prepareTransferAccept(
		command: protocol.TransferAcceptCommandPayload,
		context: TransferAcceptLegacyContext,
	): Promise<PreparedFileAccept> {
		const transferId = command.transferId?.trim();
		const senderDeviceId = context.senderDeviceId?.trim();
		if (
			!transferId ||
			!senderDeviceId ||
			typeof context.address !== "string" ||
			typeof context.port !== "number"
		) {
			throw new Error("Invalid FILE_ACCEPT payload");
		}

		if (context.port < 1 || context.port > 65535) {
			throw new Error("Invalid FILE_ACCEPT port");
		}

		if (!context.authenticatedReceiverDeviceId) {
			throw new Error("Could not determine receiver device ID from connection");
		}

		const receiverDeviceId = context.authenticatedReceiverDeviceId;
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
			address: context.address,
			port: context.port,
			transferSession,
		};
	}

	async function createTransferRejectForwardPayload(
		command: protocol.TransferRejectCommandPayload,
		context: TransferRejectLegacyContext,
	) {
		const transferId = command.transferId?.trim();
		if (!transferId) {
			throw new Error("Invalid FILE_REJECT payload");
		}

		if (!context.rejectorDeviceId) {
			throw new Error("Unauthorized rejector device");
		}

		const fallbackSession = await deps.lifecycle.getTransferSessionForFallback(transferId);
		const senderDeviceId =
			context.senderDeviceId?.trim() || context.receiverDeviceId?.trim() || fallbackSession?.senderDeviceId;

		if (!senderDeviceId) {
			throw new Error("Missing sender device for FILE_REJECT");
		}

		const transferSession = await deps.lifecycle.ensureTransferParticipants(
			transferId,
			senderDeviceId,
			context.rejectorDeviceId,
		);
		if (!transferSession) {
			throw new Error("FILE_REJECT does not match an active transfer session");
		}

		await deps.runtime.updateRuntimeStatus(
			transferId,
			"rejected",
			undefined,
			undefined,
			command.reason ?? "Transfer rejected by receiver",
		);
		await deps.lifecycle.removeTransferSession(transferId);

		return {
			targetDeviceId: senderDeviceId,
			payload: {
				transferId,
				senderDeviceId,
				reason: command.reason ?? "Transfer rejected by receiver",
			},
		};
	}

	async function prepareTransferAck(senderDeviceId: string | undefined, targetDeviceId: string, ackJson: string) {
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
	}

	return {
		prepareTransferOffer,
		prepareTransferAccept,
		createTransferRejectForwardPayload,
		prepareTransferAck,

		async prepareFileOffer(
			payload: {
				transferId?: string;
				fromDeviceId?: string;
				toDeviceId?: string;
				files?: Array<{ name: string; size: number; extension: string }>;
			},
			senderDeviceId: string | undefined,
		): Promise<PreparedFileOffer> {
			return prepareTransferOffer(
				{
					transferId: payload.transferId ?? "",
					senderDeviceId: payload.fromDeviceId ?? "",
					receiverDeviceId: payload.toDeviceId ?? "",
					mode: "AUTO",
					manifest: {
						id: payload.transferId ?? "",
						items: (payload.files ?? []).map((file, index) => ({
							id: `${payload.transferId ?? "unknown"}:file:${index}`,
							kind: "file",
							name: file.name,
							size: file.size,
						})),
						createdAt: new Date(0).toISOString(),
					},
				},
				senderDeviceId,
			);
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
			return prepareTransferAccept(
				{
					transferId: payload.transferId ?? "",
					receiverDeviceId: receiverDeviceId ?? "",
				},
				{
					authenticatedReceiverDeviceId: receiverDeviceId,
					senderDeviceId: payload.senderDeviceId,
					address: payload.address,
					port: payload.port,
				},
			);
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
			return createTransferRejectForwardPayload(
				{
					transferId: payload.transferId ?? "",
					reason: payload.reason,
				},
				{
					rejectorDeviceId,
					senderDeviceId: payload.senderDeviceId,
					receiverDeviceId: payload.receiverDeviceId,
				},
			);
		},

		async resolveFileAck(senderDeviceId: string | undefined, targetDeviceId: string, ackJson: string) {
			return prepareTransferAck(senderDeviceId, targetDeviceId, ackJson);
		},
	};
}

export type TransferLifecycleService = ReturnType<typeof createTransferLifecycleService>;

import { createRelayTicketService, createTransferLifecycleService, createTransferRuntimeService } from "./application";
import type { TransferSessionRecord } from "./transfer.types";
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

interface SenderDevice {
	id: string;
	fingerprint: string | null;
	deviceName: string;
	userId: string;
}

interface TargetDevice {
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
	findTargetDevice(deviceId: string): Promise<TargetDevice | null | undefined>;
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

export interface TransferHttpRepository {
	findDeviceIdBySessionId(sessionId: string): Promise<string | undefined>;
	findOwnedDeviceId(deviceId: string, userId: string): Promise<string | undefined>;
}

export interface PreparedFileOffer {
	transferId: string;
	targetDeviceId: string;
	senderDeviceId: string;
	senderDevice: SenderDevice;
	senderUser: UserSummary | null | undefined;
	targetDevice: TargetDevice;
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

export type { IssuedTransferRelayTickets, IssueRelayTicketsInput, RelayTicketResponse } from "./application";
export { createInitialProgress, createRuntimeFromOffer, getTotalBytes } from "./application";

export function createTransferService(deps: TransferServiceDependencies) {
	const runtime = createTransferRuntimeService({
		runtimeStore: deps.runtimeStore,
		onRuntimeError: deps.onRuntimeError,
	});
	const relayTickets = createRelayTicketService({
		runtimeStore: deps.runtimeStore,
	});
	const lifecycle = createTransferLifecycleService({
		devices: deps.devices,
		lifecycle: deps.lifecycle,
		runtime,
	});

	return {
		issueRelayTickets: relayTickets.issueRelayTickets,
		verifyRelayTicket: relayTickets.verifyRelayTicket,
		issueCallerRelayTicket: relayTickets.issueCallerRelayTicket,
		markRelayPeersConnected: runtime.markRelayPeersConnected,
		markRelayPeerDisconnected: runtime.markRelayPeerDisconnected,
		recordRelayProgress: runtime.recordRelayProgress,
		prepareFileOffer: lifecycle.prepareFileOffer,
		getFileOfferTargetUnavailablePayload: lifecycle.getFileOfferTargetUnavailablePayload,
		createFileOfferForwardPayload: lifecycle.createFileOfferForwardPayload,
		getFileOfferUnreachablePayload: lifecycle.getFileOfferUnreachablePayload,
		prepareFileAccept: lifecycle.prepareFileAccept,
		createFileAcceptForwardPayload: lifecycle.createFileAcceptForwardPayload,
		createFileRejectForwardPayload: lifecycle.createFileRejectForwardPayload,
		resolveFileAck: lifecycle.resolveFileAck,
	};
}

import { safeJsonParse } from "@/shared/utils/json-helper";

type TransferSessionState = "offered" | "accepted";

export interface TransferSessionRecord {
	transferId: string;
	senderDeviceId: string;
	receiverDeviceId: string;
	state: TransferSessionState;
	updatedAt: number;
}

const TRANSFER_SESSION_TTL_MS = 30 * 60 * 1000;
const transferSessions = new Map<string, TransferSessionRecord>();

function cleanupTransferSessions(now: number = Date.now()): void {
	for (const [transferId, session] of transferSessions.entries()) {
		if (now - session.updatedAt > TRANSFER_SESSION_TTL_MS) {
			transferSessions.delete(transferId);
		}
	}
}

export function registerTransferOffer(
	transferId: string,
	senderDeviceId: string,
	receiverDeviceId: string,
): { ok: true } | { ok: false; reason: string } {
	cleanupTransferSessions();

	const existing = transferSessions.get(transferId);
	if (existing) {
		if (existing.senderDeviceId === senderDeviceId && existing.receiverDeviceId === receiverDeviceId) {
			existing.state = "offered";
			existing.updatedAt = Date.now();
			return { ok: true };
		}

		return {
			ok: false,
			reason: "Transfer ID is already used by another transfer session",
		};
	}

	transferSessions.set(transferId, {
		transferId,
		senderDeviceId,
		receiverDeviceId,
		state: "offered",
		updatedAt: Date.now(),
	});

	return { ok: true };
}

function getTransferSession(transferId: string): TransferSessionRecord | undefined {
	cleanupTransferSessions();
	return transferSessions.get(transferId);
}

export function ensureTransferParticipants(
	transferId: string,
	senderDeviceId: string,
	receiverDeviceId: string,
): TransferSessionRecord | undefined {
	const session = getTransferSession(transferId);
	if (!session) {
		return undefined;
	}

	if (session.senderDeviceId !== senderDeviceId || session.receiverDeviceId !== receiverDeviceId) {
		return undefined;
	}

	session.updatedAt = Date.now();
	return session;
}

export function markTransferAccepted(transferId: string): void {
	const session = transferSessions.get(transferId);
	if (!session) {
		return;
	}

	session.state = "accepted";
	session.updatedAt = Date.now();
}

export function removeTransferSession(transferId: string): void {
	transferSessions.delete(transferId);
}

function isTransferPair(session: TransferSessionRecord, deviceA: string, deviceB: string): boolean {
	return (
		(session.senderDeviceId === deviceA && session.receiverDeviceId === deviceB) ||
		(session.senderDeviceId === deviceB && session.receiverDeviceId === deviceA)
	);
}

function findAcceptedSessionsByPair(deviceA: string, deviceB: string): TransferSessionRecord[] {
	cleanupTransferSessions();
	const result: TransferSessionRecord[] = [];

	for (const session of transferSessions.values()) {
		if (session.state !== "accepted") {
			continue;
		}

		if (isTransferPair(session, deviceA, deviceB)) {
			result.push(session);
		}
	}

	return result;
}

export function resolveTransferForAck(
	senderDeviceId: string,
	targetDeviceId: string,
	ackJson: string,
): TransferSessionRecord | undefined {
	const parsedAck = safeJsonParse<{ transferId?: string }>(ackJson);
	const transferId = parsedAck.data?.transferId?.trim();

	if (transferId) {
		const session = getTransferSession(transferId);
		if (!session || session.state !== "accepted") {
			return undefined;
		}

		if (!isTransferPair(session, senderDeviceId, targetDeviceId)) {
			return undefined;
		}

		session.updatedAt = Date.now();
		return session;
	}

	const pairSessions = findAcceptedSessionsByPair(senderDeviceId, targetDeviceId);
	if (pairSessions.length !== 1) {
		return undefined;
	}

	pairSessions[0].updatedAt = Date.now();
	return pairSessions[0];
}

export function getTransferSessionForFallback(transferId: string): TransferSessionRecord | undefined {
	return getTransferSession(transferId);
}

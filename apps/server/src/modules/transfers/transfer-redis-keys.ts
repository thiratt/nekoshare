const TRANSFER_KEY_PREFIX = "transfer";

export function getTransferSessionKey(transferId: string): string {
	return `${TRANSFER_KEY_PREFIX}:session:${transferId}`;
}

export function getTransferRuntimeKey(transferId: string): string {
	return `${TRANSFER_KEY_PREFIX}:runtime:${transferId}`;
}

export function getTransferLockKey(transferId: string): string {
	return `${TRANSFER_KEY_PREFIX}:lock:${transferId}`;
}

export function getTransferPairId(deviceA: string, deviceB: string): string {
	return deviceA < deviceB ? `${deviceA}:${deviceB}` : `${deviceB}:${deviceA}`;
}

export function getTransferAcceptedPairKey(deviceA: string, deviceB: string): string {
	return `${TRANSFER_KEY_PREFIX}:pair:accepted:${getTransferPairId(deviceA, deviceB)}`;
}

export function getTransferDeviceActiveKey(deviceId: string): string {
	return `${TRANSFER_KEY_PREFIX}:device:${deviceId}:active`;
}

export function getTransferUserRecentKey(userId: string): string {
	return `${TRANSFER_KEY_PREFIX}:user:${userId}:recent`;
}

export function getTransferProgressKey(transferId: string): string {
	return `${TRANSFER_KEY_PREFIX}:progress:${transferId}`;
}

export function getTransferEventsKey(transferId: string): string {
	return `${TRANSFER_KEY_PREFIX}:events:${transferId}`;
}

// TODO: Consider using a Redis hash for relay tickets instead of individual keys and sets,
// to reduce the number of keys and operations needed to manage them.
export function getTransferRelayTicketKey(ticketId: string): string {
	return `${TRANSFER_KEY_PREFIX}:relay:ticket:${ticketId}`;
}

export function getTransferRelayTicketsByTransferKey(transferId: string): string {
	return `${TRANSFER_KEY_PREFIX}:relay:by-transfer:${transferId}`;
}

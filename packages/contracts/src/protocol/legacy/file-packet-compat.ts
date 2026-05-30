// Legacy FILE_* packet compatibility notes only. This does not wire Protocol v1
// to the existing prototype packet runtime.
export const LegacyFilePacketCompat = {
	FILE_OFFER: "TRANSFER_OFFER",
	FILE_ACCEPT: "TRANSFER_ACCEPT",
	FILE_REJECT: "TRANSFER_REJECT",
	FILE_PAUSE: "TRANSFER_STATUS_CHANGED",
	FILE_RESUME: "TRANSFER_STATUS_CHANGED",
	FILE_ACK: "TRANSFER_PROGRESS_UPDATED",
	FILE_CHUNK: "CHUNK",
} as const;

export type LegacyFilePacketName = keyof typeof LegacyFilePacketCompat;

export type LegacyFilePacketProtocolMapping = (typeof LegacyFilePacketCompat)[LegacyFilePacketName];

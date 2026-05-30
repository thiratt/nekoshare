export const TransferMode = {
	AUTO: "AUTO",
	LAN_DIRECT: "LAN_DIRECT",
	RELAY: "RELAY",
} as const;

export type TransferMode = (typeof TransferMode)[keyof typeof TransferMode];

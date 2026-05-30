export const ControlPacketKind = {
	COMMAND: "COMMAND",
	EVENT: "EVENT",
	RESULT: "RESULT",
	ERROR: "ERROR",
} as const;

export type ControlPacketKind = (typeof ControlPacketKind)[keyof typeof ControlPacketKind];

export const DataFrameType = {
	FILE_START: 0x01,
	CHUNK: 0x02,
	FILE_END: 0x03,
	TRANSFER_END: 0x04,
	CHECKPOINT: 0x05,
	ERROR: 0x06,
} as const;

export type DataFrameType = (typeof DataFrameType)[keyof typeof DataFrameType];

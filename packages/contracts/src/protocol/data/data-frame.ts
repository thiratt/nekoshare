import type { DataFrameType } from "./data-frame-type";

export interface DataFrameHeader {
	type: DataFrameType;
	transferId: string;
	fileId: string;
	offset: number;
	length: number;
}

export interface DataFrame<TPayload = Uint8Array> {
	header: DataFrameHeader;
	payload: TPayload;
}

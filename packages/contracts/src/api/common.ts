export interface ApiSuccessResponse<TData> {
	success: true;
	data: TData;
}

export interface ApiErrorResponse<TErrorCode extends string = string> {
	success: false;
	error: TErrorCode;
	message?: string;
	requestId?: string;
}

export type ApiResponse<TData, TErrorCode extends string = string> =
	| ApiSuccessResponse<TData>
	| ApiErrorResponse<TErrorCode>;

export interface PaginatedResponse<TItem> {
	items: TItem[];
	total: number;
}

export interface ControlErrorPayload {
	code: string;
	message: string;
	retryable: boolean;
	details?: unknown;
}

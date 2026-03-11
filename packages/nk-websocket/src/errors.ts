export const ErrorSource = {
	INTERNAL: "INTERNAL",
	EXTERNAL_API: "EXTERNAL_API",
	EXTERNAL_WEBSOCKET: "EXTERNAL_WEBSOCKET",
	EXTERNAL_DATABASE: "EXTERNAL_DATABASE",
	EXTERNAL_FILESYSTEM: "EXTERNAL_FILESYSTEM",
	EXTERNAL_BROWSER: "EXTERNAL_BROWSER",
	UNKNOWN: "UNKNOWN",
} as const;

export type ErrorSource = (typeof ErrorSource)[keyof typeof ErrorSource];

export const ErrorCategory = {
	NETWORK: "NETWORK",
	AUTH: "AUTH",
	VALIDATION: "VALIDATION",
	NOT_FOUND: "NOT_FOUND",
	RATE_LIMIT: "RATE_LIMIT",
	SERVER: "SERVER",
	CLIENT: "CLIENT",
	PARSE: "PARSE",
	TIMEOUT: "TIMEOUT",
	ABORTED: "ABORTED",
	UNKNOWN: "UNKNOWN",
} as const;

export type ErrorCategory = (typeof ErrorCategory)[keyof typeof ErrorCategory];

export interface NkWebSocketErrorContext {
	operation?: string | undefined;
	endpoint?: string | undefined;
	cause?: unknown;
	metadata?: Record<string, unknown> | undefined;
}

export class NkWebSocketError extends Error {
	public readonly source: ErrorSource;
	public readonly category: ErrorCategory;
	public readonly context: NkWebSocketErrorContext;
	public readonly timestamp: Date;
	public readonly isRecoverable: boolean;

	constructor(
		message: string,
		source: ErrorSource,
		category: ErrorCategory,
		context: NkWebSocketErrorContext = {},
		isRecoverable = true,
	) {
		super(message);
		this.name = "NkWebSocketError";
		this.source = source;
		this.category = category;
		this.context = context;
		this.timestamp = new Date();
		this.isRecoverable = isRecoverable;
	}
}

export interface ResultSuccess<T> {
	readonly status: "success";
	readonly data: T;
}

export interface ResultError {
	readonly status: "error";
	readonly error: NkWebSocketError;
}

export type Result<T> = ResultSuccess<T> | ResultError;

export function success<T>(data: T): ResultSuccess<T> {
	return { status: "success", data };
}

export function failure(error: NkWebSocketError): ResultError {
	return { status: "error", error };
}

export function createTimeoutError(operation: string, timeoutMs: number): NkWebSocketError {
	return new NkWebSocketError(
		`Operation "${operation}" timed out after ${timeoutMs}ms`,
		ErrorSource.EXTERNAL_API,
		ErrorCategory.TIMEOUT,
		{ operation, metadata: { timeoutMs } },
	);
}

export function createParseError(message: string, source: "api" | "local", cause?: unknown): NkWebSocketError {
	return new NkWebSocketError(
		`Failed to parse ${source === "api" ? "API response" : "local"} data: ${message}`,
		source === "api" ? ErrorSource.EXTERNAL_API : ErrorSource.INTERNAL,
		ErrorCategory.PARSE,
		{ cause, operation: "JSON Parsing" },
	);
}

export function createWebSocketError(message: string, cause?: unknown): NkWebSocketError {
	return new NkWebSocketError(
		`WebSocket connection error: ${message}`,
		ErrorSource.EXTERNAL_WEBSOCKET,
		ErrorCategory.NETWORK,
		{ cause, operation: "WebSocket Connection" },
	);
}

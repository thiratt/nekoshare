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

export function httpStatusToCategory(status: number): ErrorCategory {
	if (status === 401 || status === 403) return ErrorCategory.AUTH;
	if (status === 404) return ErrorCategory.NOT_FOUND;
	if (status === 422 || status === 400) return ErrorCategory.VALIDATION;
	if (status === 429) return ErrorCategory.RATE_LIMIT;
	if (status >= 500) return ErrorCategory.SERVER;
	if (status >= 400) return ErrorCategory.CLIENT;
	return ErrorCategory.UNKNOWN;
}

export interface AppErrorContext {
	operation?: string;
	endpoint?: string;
	httpStatus?: number;
	cause?: unknown;
	metadata?: Record<string, unknown>;
	requestId?: string;
}

export class AppError extends Error {
	public readonly source: ErrorSource;
	public readonly category: ErrorCategory;
	public readonly context: AppErrorContext;
	public readonly timestamp: Date;
	public readonly isRecoverable: boolean;

	constructor(
		message: string,
		source: ErrorSource,
		category: ErrorCategory,
		context: AppErrorContext = {},
		isRecoverable = true,
	) {
		super(message);
		this.name = "AppError";
		this.source = source;
		this.category = category;
		this.context = context;
		this.timestamp = new Date();
		this.isRecoverable = isRecoverable;

		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, AppError);
		}
	}

	public toUserMessage(): string {
		const sourceLabel = this.getSourceLabel();
		return `${sourceLabel}: ${this.message}`;
	}

	public toDetailedMessage(): string {
		const parts: string[] = [
			`[${this.source}/${this.category}] ${this.message}`,
			`Timestamp: ${this.timestamp.toISOString()}`,
			`Recoverable: ${this.isRecoverable}`,
		];

		if (this.context.operation) {
			parts.push(`Operation: ${this.context.operation}`);
		}
		if (this.context.endpoint) {
			parts.push(`Endpoint: ${this.context.endpoint}`);
		}
		if (this.context.httpStatus) {
			parts.push(`HTTP Status: ${this.context.httpStatus}`);
		}
		if (this.context.requestId) {
			parts.push(`Request ID: ${this.context.requestId}`);
		}
		if (this.context.cause) {
			parts.push(`Cause: ${String(this.context.cause)}`);
		}

		return parts.join("\n");
	}

	private getSourceLabel(): string {
		switch (this.source) {
			case ErrorSource.INTERNAL:
				return "Internal Application Error";
			case ErrorSource.EXTERNAL_API:
				return "External API Error";
			case ErrorSource.EXTERNAL_WEBSOCKET:
				return "WebSocket Connection Error";
			case ErrorSource.EXTERNAL_DATABASE:
				return "Database Error";
			case ErrorSource.EXTERNAL_FILESYSTEM:
				return "File System Error";
			case ErrorSource.EXTERNAL_BROWSER:
				return "Browser Environment Error";
			default:
				return "Unknown Error";
		}
	}

	public isAbortError(): boolean {
		return this.category === ErrorCategory.ABORTED;
	}

	public shouldRetry(): boolean {
		if (!this.isRecoverable) return false;
		return (
			this.category === ErrorCategory.NETWORK ||
			this.category === ErrorCategory.TIMEOUT ||
			this.category === ErrorCategory.SERVER
		);
	}
}

export interface ResultSuccess<T> {
	readonly status: "success";
	readonly data: T;
}

export interface ResultError {
	readonly status: "error";
	readonly error: AppError;
}

export type Result<T> = ResultSuccess<T> | ResultError;

export function success<T>(data: T): ResultSuccess<T> {
	return { status: "success", data };
}

export function failure(error: AppError): ResultError {
	return { status: "error", error };
}

export function isSuccess<T>(result: Result<T>): result is ResultSuccess<T> {
	return result.status === "success";
}

export function isError<T>(result: Result<T>): result is ResultError {
	return result.status === "error";
}

export function unwrapResult<T>(result: Result<T>): T {
	if (isSuccess(result)) {
		return result.data;
	}
	throw result.error;
}

export function unwrapOr<T>(result: Result<T>, defaultValue: T): T {
	if (isSuccess(result)) {
		return result.data;
	}
	return defaultValue;
}

export function mapResult<T, U>(result: Result<T>, fn: (data: T) => U): Result<U> {
	if (isSuccess(result)) {
		return success(fn(result.data));
	}
	return result;
}

export function createNetworkError(message: string, endpoint: string, cause?: unknown): AppError {
	return new AppError(
		`Unable to establish connection with the API at ${endpoint}. ${message}`,
		ErrorSource.EXTERNAL_API,
		ErrorCategory.NETWORK,
		{ endpoint, cause, operation: "Network Request" },
	);
}

export function createApiError(message: string, endpoint: string, httpStatus: number, requestId?: string): AppError {
	const category = httpStatusToCategory(httpStatus);
	const isRecoverable = category !== ErrorCategory.AUTH && category !== ErrorCategory.NOT_FOUND;

	return new AppError(
		`API request to ${endpoint} failed with status ${httpStatus}: ${message}`,
		ErrorSource.EXTERNAL_API,
		category,
		{ endpoint, httpStatus, requestId, operation: "API Request" },
		isRecoverable,
	);
}

export function createTimeoutError(operation: string, timeoutMs: number): AppError {
	return new AppError(
		`Operation "${operation}" timed out after ${timeoutMs}ms`,
		ErrorSource.EXTERNAL_API,
		ErrorCategory.TIMEOUT,
		{ operation, metadata: { timeoutMs } },
	);
}

export function createParseError(message: string, source: "api" | "local", cause?: unknown): AppError {
	return new AppError(
		`Failed to parse ${source === "api" ? "API response" : "local"} data: ${message}`,
		source === "api" ? ErrorSource.EXTERNAL_API : ErrorSource.INTERNAL,
		ErrorCategory.PARSE,
		{ cause, operation: "JSON Parsing" },
	);
}

export function createWebSocketError(message: string, cause?: unknown): AppError {
	return new AppError(
		`WebSocket connection error: ${message}`,
		ErrorSource.EXTERNAL_WEBSOCKET,
		ErrorCategory.NETWORK,
		{ cause, operation: "WebSocket Connection" },
	);
}

export function createAbortError(operation: string): AppError {
	return new AppError(
		`Operation "${operation}" was aborted by the user`,
		ErrorSource.INTERNAL,
		ErrorCategory.ABORTED,
		{ operation },
		true,
	);
}

export function createInternalError(message: string, operation: string, cause?: unknown): AppError {
	return new AppError(
		`Internal application error in "${operation}": ${message}`,
		ErrorSource.INTERNAL,
		ErrorCategory.CLIENT,
		{ cause, operation },
		false,
	);
}

export function createValidationError(message: string, field?: string): AppError {
	return new AppError(
		field ? `Validation error for "${field}": ${message}` : `Validation error: ${message}`,
		ErrorSource.INTERNAL,
		ErrorCategory.VALIDATION,
		{ operation: "Validation", metadata: field ? { field } : undefined },
		true,
	);
}

export function toAppError(error: unknown, context?: AppErrorContext): AppError {
	if (error instanceof AppError) {
		return error;
	}

	if (error instanceof Error) {
		if (error.name === "AbortError") {
			return createAbortError(context?.operation ?? "Unknown operation");
		}

		if (error.name === "TypeError" && error.message.includes("fetch")) {
			return createNetworkError(error.message, context?.endpoint ?? "Unknown endpoint", error);
		}

		if (error.name === "TimeoutError" || error.message.toLowerCase().includes("timeout")) {
			return createTimeoutError(context?.operation ?? "Unknown operation", 0);
		}

		return new AppError(error.message, ErrorSource.UNKNOWN, ErrorCategory.UNKNOWN, { ...context, cause: error });
	}

	if (typeof error === "string") {
		return new AppError(error, ErrorSource.UNKNOWN, ErrorCategory.UNKNOWN, context);
	}

	return new AppError("An unexpected error occurred", ErrorSource.UNKNOWN, ErrorCategory.UNKNOWN, {
		...context,
		cause: error,
	});
}

export async function tryCatch<T>(fn: () => Promise<T>, context?: AppErrorContext): Promise<Result<T>> {
	try {
		const data = await fn();
		return success(data);
	} catch (error) {
		return failure(toAppError(error, context));
	}
}

export function tryCatchSync<T>(fn: () => T, context?: AppErrorContext): Result<T> {
	try {
		const data = fn();
		return success(data);
	} catch (error) {
		return failure(toAppError(error, context));
	}
}

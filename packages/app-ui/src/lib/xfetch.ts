import { config } from "./config";
import {
	AppError,
	createApiError,
	createNetworkError,
	createParseError,
	ErrorCategory,
	ErrorSource,
	failure,
	type Result,
	success,
	toAppError,
} from "./errors";

import type { ApiErrorResponse, ApiResponse } from "@workspace/contracts/api";

export interface XFetchOptions extends Omit<RequestInit, "body"> {
	body?: RequestInit["body"] | Record<string, unknown> | object;
	timeout?: number;
	operation?: string;
}

export interface XFetchResponse<T> {
	data: T;
	status: number;
	headers: Headers;
}

type ValidUrlInput = string | Request;

function resolveUrl(input: ValidUrlInput): Result<string> {
	if (typeof input === "string") {
		const trimmed = input.trim();

		if (trimmed.length === 0) {
			return failure(
				new AppError(
					"URL cannot be empty",
					ErrorSource.INTERNAL,
					ErrorCategory.VALIDATION,
					{ operation: "URL Resolution" },
					false,
				),
			);
		}

		if (/^https?:\/\//i.test(trimmed)) {
			return success(trimmed);
		}

		const baseUrl = config.apiBaseUrl.replace(/\/+$/, "");
		const path = trimmed.replace(/^\/+/, "");
		return success(`${baseUrl}/${path}`);
	}

	if (input instanceof Request) {
		return success(input.url);
	}

	return failure(
		new AppError(
			"Invalid URL input type. Expected string or Request object.",
			ErrorSource.INTERNAL,
			ErrorCategory.VALIDATION,
			{ operation: "URL Resolution", metadata: { inputType: typeof input } },
			false,
		),
	);
}

function createTimeoutController(
	timeoutMs: number,
	existingSignal?: AbortSignal | null,
): { controller: AbortController; cleanup: () => void } {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

	if (existingSignal) {
		existingSignal.addEventListener("abort", () => controller.abort());
	}

	return {
		controller,
		cleanup: () => clearTimeout(timeoutId),
	};
}

function prepareRequestOptions(options: XFetchOptions): RequestInit {
	const { body, timeout: _timeout, operation: _operation, ...rest } = options;

	const init: RequestInit = {
		...rest,
		credentials: "include",
	};

	if (body !== undefined && body !== null) {
		if (typeof body === "object" && !(body instanceof FormData) && !(body instanceof Blob)) {
			init.body = JSON.stringify(body);
			init.headers = {
				"Content-Type": "application/json",
				...init.headers,
			};
		} else {
			init.body = body as BodyInit;
		}
	}

	return init;
}

async function xfetch(input: ValidUrlInput, options: XFetchOptions = {}): Promise<Response> {
	const urlResult = resolveUrl(input);
	if (urlResult.status === "error") {
		throw urlResult.error;
	}
	const url = urlResult.data;

	const { timeout = 30000, operation = "API Request" } = options;

	const { controller, cleanup } = createTimeoutController(timeout, options.signal);

	try {
		const requestOptions = prepareRequestOptions(options);
		requestOptions.signal = controller.signal;

		const response = await fetch(url, requestOptions);
		cleanup();

		return response;
	} catch (error) {
		cleanup();

		if (error instanceof Error && error.name === "AbortError") {
			if (options.signal?.aborted) {
				throw new AppError(
					`Operation "${operation}" was cancelled`,
					ErrorSource.INTERNAL,
					ErrorCategory.ABORTED,
					{ operation, endpoint: url },
				);
			}

			throw new AppError(
				`Operation "${operation}" timed out after ${timeout}ms while attempting to reach ${url}`,
				ErrorSource.EXTERNAL_API,
				ErrorCategory.TIMEOUT,
				{ operation, endpoint: url, metadata: { timeout } },
			);
		}

		if (error instanceof TypeError) {
			throw createNetworkError(
				"The server might be unavailable, or there may be a network connectivity issue.",
				url,
				error,
			);
		}

		throw toAppError(error, { operation, endpoint: url });
	}
}

async function xfetchJson<T>(input: ValidUrlInput, options: XFetchOptions = {}): Promise<Result<XFetchResponse<T>>> {
	const operation = options.operation ?? "Fetch JSON data";

	try {
		const response = await xfetch(input, options);
		const url = typeof input === "string" ? input : input.url;

		if (!response.ok) {
			let errorMessage = `Request failed with status ${response.status}`;
			let requestId: string | undefined;

			try {
				const errorData = (await response.json()) as ApiErrorResponse;
				if (errorData.message) {
					errorMessage = errorData.message;
				}
				requestId = errorData.requestId;
			} catch {
				errorMessage = response.statusText || errorMessage;
			}

			return failure(createApiError(errorMessage, url, response.status, requestId));
		}

		let data: T;
		try {
			data = (await response.json()) as T;
		} catch (parseError) {
			return failure(createParseError("Response body is not valid JSON", "api", parseError));
		}

		return success({
			data,
			status: response.status,
			headers: response.headers,
		});
	} catch (error) {
		if (error instanceof AppError) {
			return failure(error);
		}
		return failure(toAppError(error, { operation }));
	}
}

async function xfetchApi<T>(input: ValidUrlInput, options: XFetchOptions = {}): Promise<Result<T>> {
	const result = await xfetchJson<ApiResponse<T>>(input, options);

	if (result.status === "error") {
		return result;
	}

	const apiResponse = result.data.data;

	if (!apiResponse.success) {
		const url = typeof input === "string" ? input : input.url;
		return failure(
			createApiError(
				apiResponse.message || "API returned an unsuccessful response",
				url,
				result.data.status,
				apiResponse.requestId,
			),
		);
	}

	return success(apiResponse.data);
}

export { xfetch, xfetchApi, xfetchJson };

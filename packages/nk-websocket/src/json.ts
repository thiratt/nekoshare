import { createParseError, failure, type Result, success } from "./errors";

export function safeJsonParse<T>(
	jsonString: string,
	context?: { source?: "api" | "local"; operation?: string },
): Result<T> {
	if (typeof jsonString !== "string") {
		return failure(
			createParseError(`Expected a string but received ${typeof jsonString}`, context?.source ?? "local"),
		);
	}

	if (jsonString.trim().length === 0) {
		return failure(createParseError("Cannot parse empty string as JSON", context?.source ?? "local"));
	}

	try {
		const parsed = JSON.parse(jsonString) as T;
		return success(parsed);
	} catch (error) {
		const errorMessage = error instanceof SyntaxError ? error.message : "Unknown parsing error occurred";

		return failure(createParseError(`Invalid JSON: ${errorMessage}`, context?.source ?? "local", error));
	}
}

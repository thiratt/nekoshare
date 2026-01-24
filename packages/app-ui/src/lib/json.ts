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

export function safeJsonStringify(value: unknown, options?: { space?: number | string }): Result<string> {
	try {
		const jsonString = JSON.stringify(value, null, options?.space);

		if (jsonString === undefined) {
			return failure(createParseError("Value cannot be serialized to JSON (result is undefined)", "local"));
		}

		return success(jsonString);
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : "Unknown serialization error occurred";

		return failure(createParseError(`Failed to serialize value to JSON: ${errorMessage}`, "local", error));
	}
}

export function isJsonObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isJsonArray(value: unknown): value is unknown[] {
	return Array.isArray(value);
}

export function getJsonPath<T = unknown>(obj: unknown, path: string): T | undefined {
	if (!isJsonObject(obj)) {
		return undefined;
	}

	const keys = path.split(".");
	let current: unknown = obj;

	for (const key of keys) {
		if (!isJsonObject(current)) {
			return undefined;
		}
		current = current[key];
	}

	return current as T;
}

type SafeParseResult<T> = { data: T; error: null } | { data: null; error: Error };

function safeJsonParse<T>(jsonString: string): SafeParseResult<T> {
	try {
		const parsed = JSON.parse(jsonString) as T;
		return { data: parsed, error: null };
	} catch (err) {
		return {
			data: null,
			error: err instanceof Error ? err : new Error("Invalid JSON"),
		};
	}
}

function safeJsonStringify<T>(data: T): SafeParseResult<string> {
	try {
		const jsonString = JSON.stringify(data);
		return { data: jsonString, error: null };
	} catch (err) {
		return {
			data: null,
			error: err instanceof Error ? err : new Error("Stringify Error"),
		};
	}
}

export { safeJsonParse, safeJsonStringify, type SafeParseResult };

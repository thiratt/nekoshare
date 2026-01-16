export type SafeJsonParseData<T> = { success: true; data: T } | { success: false; error: unknown };

export function safeJsonParse<T>(jsonString: string): SafeJsonParseData<T> {
	try {
		const parsed = JSON.parse(jsonString) as T;
		return { success: true, data: parsed };
	} catch (e) {
		return { success: false, error: e };
	}
}

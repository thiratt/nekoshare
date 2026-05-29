export function generateHistoryStableId(path: string): number {
	let hash = 0;
	for (let i = 0; i < path.length; i++) {
		const char = path.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash &= hash;
	}

	return Math.abs(hash);
}

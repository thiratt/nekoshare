import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";

import type { ShareItem } from "@workspace/app-ui/types/home";

const DEBOUNCE_DELAY = 150;
const RUST_THRESHOLD = 500;
const FUZZY_THRESHOLD = 0.3;

interface UseFileSearchOptions {
	items: ShareItem[];
	rustSearch?: (items: ShareItem[], query: string, threshold: number) => Promise<ShareItem[]>;
	debounceMs?: number;
}

interface UseFileSearchReturn {
	query: string;
	setQuery: (query: string) => void;
	filteredItems: ShareItem[];
	isSearching: boolean;
	clearSearch: () => void;
	searchTimeMs: number;
}

function localFuzzySearch(items: ShareItem[], query: string, threshold: number): ShareItem[] {
	const trimmed = query.trim().toLowerCase();
	if (!trimmed) return items;

	const results: Array<{ item: ShareItem; score: number }> = [];

	for (const item of items) {
		const nameLower = item.name.toLowerCase();
		const deviceLower = item.device?.toLowerCase() ?? "";
		const friendLower = item.friendName?.toLowerCase() ?? "";

		let score = 0;

		if (nameLower === trimmed) {
			score = 1.0;
		} else if (nameLower.startsWith(trimmed)) {
			score = 0.95;
		} else if (nameLower.includes(trimmed)) {
			score = 0.8 + (trimmed.length / nameLower.length) * 0.1;
		} else {
			let matched = 0;
			let targetIdx = 0;
			for (const char of trimmed) {
				while (targetIdx < nameLower.length) {
					if (nameLower[targetIdx] === char) {
						matched++;
						targetIdx++;
						break;
					}
					targetIdx++;
				}
			}
			const matchRatio = matched / trimmed.length;
			if (matchRatio >= threshold) {
				score = matchRatio * 0.7;
			}
		}

		if (score < 0.8) {
			if (deviceLower.includes(trimmed)) {
				score = Math.max(score, 0.6);
			}
			if (friendLower.includes(trimmed)) {
				score = Math.max(score, 0.6);
			}
		}

		if (score >= threshold) {
			results.push({ item, score });
		}
	}

	results.sort((a, b) => b.score - a.score);

	return results.map((r) => r.item);
}

export function useFileSearch({
	items,
	rustSearch,
	debounceMs = DEBOUNCE_DELAY,
}: UseFileSearchOptions): UseFileSearchReturn {
	const [query, setQuery] = useState("");
	const [debouncedQuery, setDebouncedQuery] = useState("");
	const [filteredItems, setFilteredItems] = useState<ShareItem[]>(items);
	const [isPending, startTransition] = useTransition();
	const [searchTimeMs, setSearchTimeMs] = useState(0);

	const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const abortControllerRef = useRef<AbortController | null>(null);

	useEffect(() => {
		if (!debouncedQuery.trim()) {
			setFilteredItems(items);
		}
	}, [items, debouncedQuery]);

	useEffect(() => {
		if (debounceTimerRef.current) {
			clearTimeout(debounceTimerRef.current);
		}

		debounceTimerRef.current = setTimeout(() => {
			setDebouncedQuery(query);
		}, debounceMs);

		return () => {
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
			}
		};
	}, [query, debounceMs]);

	useEffect(() => {
		const trimmed = debouncedQuery.trim();

		if (abortControllerRef.current) {
			abortControllerRef.current.abort();
		}

		if (!trimmed) {
			setFilteredItems(items);
			setSearchTimeMs(0);
			return;
		}

		const abortController = new AbortController();
		abortControllerRef.current = abortController;

		const performSearch = async () => {
			const startTime = performance.now();

			const shouldUseRust = items.length >= RUST_THRESHOLD && rustSearch;

			if (shouldUseRust) {
				try {
					const results = await rustSearch(items, trimmed, FUZZY_THRESHOLD);
					if (!abortController.signal.aborted) {
						startTransition(() => {
							setFilteredItems(results);
							setSearchTimeMs(performance.now() - startTime);
						});
					}
				} catch {
					if (!abortController.signal.aborted) {
						const results = localFuzzySearch(items, trimmed, FUZZY_THRESHOLD);
						startTransition(() => {
							setFilteredItems(results);
							setSearchTimeMs(performance.now() - startTime);
						});
					}
				}
			} else {
				const results = localFuzzySearch(items, trimmed, FUZZY_THRESHOLD);
				if (!abortController.signal.aborted) {
					startTransition(() => {
						setFilteredItems(results);
						setSearchTimeMs(performance.now() - startTime);
					});
				}
			}
		};

		performSearch();

		return () => {
			abortController.abort();
		};
	}, [debouncedQuery, items, rustSearch]);

	const clearSearch = useCallback(() => {
		setQuery("");
		setDebouncedQuery("");
		setFilteredItems(items);
		setSearchTimeMs(0);
	}, [items]);

	return {
		query,
		setQuery,
		filteredItems,
		isSearching: isPending,
		clearSearch,
		searchTimeMs,
	};
}

export function useRustSearch(invoke?: <T>(cmd: string, args?: unknown) => Promise<T>) {
	return useMemo(() => {
		if (!invoke) return undefined;

		return async (items: ShareItem[], query: string, threshold: number): Promise<ShareItem[]> => {
			const result = await invoke<{ items: ShareItem[]; total: number; timeMs: number }>("search_items", {
				items,
				query,
				threshold,
			});
			return result.items;
		};
	}, [invoke]);
}

export { DEBOUNCE_DELAY, FUZZY_THRESHOLD, RUST_THRESHOLD };

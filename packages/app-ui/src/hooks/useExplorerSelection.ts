import { useCallback, useEffect, useMemo, useState } from "react";

type ExplorerSelectionEvent = {
	ctrlKey?: boolean;
	metaKey?: boolean;
	shiftKey?: boolean;
};

type UseExplorerSelectionOptions<T> = {
	items: T[];
	getId: (item: T) => string;
	pruneOnItemsChange?: boolean;
	additiveRangeSelection?: boolean;
};

type SelectionState = {
	selectedSet: Set<string>;
	anchorId: string | null;
	focusedId: string | null;
};

export function useExplorerSelection<T>({
	items,
	getId,
	pruneOnItemsChange = true,
	additiveRangeSelection = true,
}: UseExplorerSelectionOptions<T>) {
	const [state, setState] = useState<SelectionState>(() => ({
		selectedSet: new Set(),
		anchorId: null,
		focusedId: null,
	}));

	const itemIds = useMemo(() => {
		return items.map(getId);
	}, [items, getId]);

	const idToIndex = useMemo(() => {
		const map = new Map<string, number>();

		itemIds.forEach((id, index) => {
			map.set(id, index);
		});

		return map;
	}, [itemIds]);

	const selectedIds = useMemo(() => {
		return Array.from(state.selectedSet);
	}, [state.selectedSet]);

	const selectedCount = state.selectedSet.size;

	const isSelected = useCallback(
		(id: string) => {
			return state.selectedSet.has(id);
		},
		[state.selectedSet],
	);

	const getRangeIds = useCallback(
		(fromId: string, toId: string) => {
			const fromIndex = idToIndex.get(fromId);
			const toIndex = idToIndex.get(toId);

			if (fromIndex == null || toIndex == null) {
				return [];
			}

			const start = Math.min(fromIndex, toIndex);
			const end = Math.max(fromIndex, toIndex);

			return itemIds.slice(start, end + 1);
		},
		[idToIndex, itemIds],
	);

	const selectOnly = useCallback((id: string) => {
		setState({
			selectedSet: new Set([id]),
			anchorId: id,
			focusedId: id,
		});
	}, []);

	const selectMany = useCallback((ids: string[]) => {
		setState((prev) => {
			const next = new Set(prev.selectedSet);

			for (const id of ids) {
				next.add(id);
			}

			return {
				selectedSet: next,
				anchorId: ids.at(-1) ?? prev.anchorId,
				focusedId: ids.at(-1) ?? prev.focusedId,
			};
		});
	}, []);

	const deselectMany = useCallback((ids: string[]) => {
		setState((prev) => {
			const next = new Set(prev.selectedSet);

			for (const id of ids) {
				next.delete(id);
			}

			return {
				...prev,
				selectedSet: next,
			};
		});
	}, []);

	const toggleItem = useCallback((id: string) => {
		setState((prev) => {
			const next = new Set(prev.selectedSet);

			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}

			return {
				selectedSet: next,
				anchorId: id,
				focusedId: id,
			};
		});
	}, []);

	const selectRange = useCallback(
		(id: string, options?: { additive?: boolean }) => {
			setState((prev) => {
				const anchorId = prev.anchorId ?? id;
				const rangeIds = getRangeIds(anchorId, id);

				if (rangeIds.length === 0) {
					return prev;
				}

				const shouldAdd = options?.additive ?? false;
				const next = shouldAdd ? new Set(prev.selectedSet) : new Set<string>();

				for (const rangeId of rangeIds) {
					next.add(rangeId);
				}

				return {
					selectedSet: next,
					anchorId,
					focusedId: id,
				};
			});
		},
		[getRangeIds],
	);

	const selectItem = useCallback(
		(id: string, event?: ExplorerSelectionEvent) => {
			const isToggle = Boolean(event?.ctrlKey || event?.metaKey);
			const isRange = Boolean(event?.shiftKey);

			if (isRange) {
				selectRange(id, {
					additive: additiveRangeSelection && isToggle,
				});
				return;
			}

			if (isToggle) {
				toggleItem(id);
				return;
			}

			selectOnly(id);
		},
		[additiveRangeSelection, selectOnly, selectRange, toggleItem],
	);

	const selectAll = useCallback(() => {
		setState((prev) => ({
			selectedSet: new Set(itemIds),
			anchorId: prev.anchorId ?? itemIds[0] ?? null,
			focusedId: itemIds.at(-1) ?? prev.focusedId,
		}));
	}, [itemIds]);

	const clearSelection = useCallback(() => {
		setState({
			selectedSet: new Set(),
			anchorId: null,
			focusedId: null,
		});
	}, []);

	const invertSelection = useCallback(() => {
		setState((prev) => {
			const next = new Set<string>();

			for (const id of itemIds) {
				if (!prev.selectedSet.has(id)) {
					next.add(id);
				}
			}

			return {
				selectedSet: next,
				anchorId: prev.anchorId,
				focusedId: prev.focusedId,
			};
		});
	}, [itemIds]);

	const ensureSelectedForContextMenu = useCallback((id: string) => {
		setState((prev) => {
			if (prev.selectedSet.has(id)) {
				return {
					...prev,
					focusedId: id,
				};
			}

			return {
				selectedSet: new Set([id]),
				anchorId: id,
				focusedId: id,
			};
		});
	}, []);

	const moveFocus = useCallback(
		(direction: "up" | "down", event?: ExplorerSelectionEvent) => {
			setState((prev) => {
				if (itemIds.length === 0) return prev;

				const fallbackId = itemIds[0];
				if (!fallbackId) return prev;

				const currentId = prev.focusedId ?? prev.anchorId ?? fallbackId;
				const currentIndex = idToIndex.get(currentId) ?? 0;

				const nextIndex =
					direction === "up" ? Math.max(0, currentIndex - 1) : Math.min(itemIds.length - 1, currentIndex + 1);

				const nextId = itemIds[nextIndex];
				if (!nextId) return prev;

				const isRange = Boolean(event?.shiftKey);
				const isToggle = Boolean(event?.ctrlKey || event?.metaKey);

				if (isRange) {
					const anchorId = prev.anchorId ?? currentId;
					const rangeIds = getRangeIds(anchorId, nextId);

					const nextSelected =
						additiveRangeSelection && isToggle ? new Set(prev.selectedSet) : new Set<string>();

					for (const rangeId of rangeIds) {
						nextSelected.add(rangeId);
					}

					return {
						selectedSet: nextSelected,
						anchorId,
						focusedId: nextId,
					};
				}

				return {
					selectedSet: new Set([nextId]),
					anchorId: nextId,
					focusedId: nextId,
				};
			});
		},
		[additiveRangeSelection, getRangeIds, idToIndex, itemIds],
	);

	const handleKeyDown = useCallback(
		(event: React.KeyboardEvent) => {
			const isMod = event.ctrlKey || event.metaKey;

			if (isMod && event.key.toLowerCase() === "a") {
				event.preventDefault();
				selectAll();
				return;
			}

			if (event.key === "Escape") {
				event.preventDefault();
				clearSelection();
				return;
			}

			if (event.key === "ArrowUp") {
				event.preventDefault();
				moveFocus("up", event);
				return;
			}

			if (event.key === "ArrowDown") {
				event.preventDefault();
				moveFocus("down", event);
			}
		},
		[clearSelection, moveFocus, selectAll],
	);

	useEffect(() => {
		if (!pruneOnItemsChange) return;

		setState((prev) => {
			const visibleIds = new Set(itemIds);
			let changed = false;
			const nextSelected = new Set<string>();

			for (const id of prev.selectedSet) {
				if (visibleIds.has(id)) {
					nextSelected.add(id);
				} else {
					changed = true;
				}
			}

			const nextAnchorId = prev.anchorId && visibleIds.has(prev.anchorId) ? prev.anchorId : null;

			const nextFocusedId = prev.focusedId && visibleIds.has(prev.focusedId) ? prev.focusedId : null;

			if (!changed && nextAnchorId === prev.anchorId && nextFocusedId === prev.focusedId) {
				return prev;
			}

			return {
				selectedSet: nextSelected,
				anchorId: nextAnchorId,
				focusedId: nextFocusedId,
			};
		});
	}, [itemIds, pruneOnItemsChange]);

	return {
		selectedIds,
		selectedSet: state.selectedSet,
		selectedCount,
		hasSelection: selectedCount > 0,

		anchorId: state.anchorId,
		focusedId: state.focusedId,

		isSelected,

		selectItem,
		selectOnly,
		selectMany,
		deselectMany,
		toggleItem,
		selectRange,
		selectAll,
		clearSelection,
		invertSelection,
		ensureSelectedForContextMenu,

		moveFocus,
		handleKeyDown,
	};
}

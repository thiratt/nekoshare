import * as React from "react";

type DragSelectionBox = {
	left: number;
	top: number;
	width: number;
	height: number;
};

type SelectableItemRect = DragSelectionBox & {
	id: string;
};

type UseDragSelectionOptions = {
	scrollAreaRootRef: React.RefObject<HTMLElement | null>;
	selectedIds: string[];
	onSelectionChange: (ids: string[]) => void;
	itemSelector?: string;
	disabled?: boolean;
	minDragDistance?: number;
	wheelAutoScrollPauseMs?: number;
};

type Point = {
	x: number;
	y: number;
};

type ScrollPoint = {
	left: number;
	top: number;
};

type DragSession = {
	additive: boolean;
	initialSelected: Set<string>;
	itemRects: SelectableItemRect[];
	latestClientPoint: Point;
	pointerId: number;
	startClientPoint: Point;
	startContentPoint: Point;
	startScroll: ScrollPoint;
	target: HTMLElement;
	viewport: HTMLElement;
};

function isInteractiveElement(target: EventTarget | null) {
	if (!(target instanceof HTMLElement)) return false;

	return Boolean(
		target.closest(
			[
				"button",
				"a",
				"input",
				"textarea",
				"select",
				"[role='button']",
				"[role='menuitem']",
				"[data-no-drag-select]",
			].join(","),
		),
	);
}

function distance(a: Point, b: Point) {
	return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(value: number, min: number, max: number) {
	return Math.min(max, Math.max(min, value));
}

function getScrollPoint(viewport: HTMLElement): ScrollPoint {
	return {
		left: viewport.scrollLeft,
		top: viewport.scrollTop,
	};
}

function toContentPoint(viewport: HTMLElement, clientPoint: Point): Point {
	const rect = viewport.getBoundingClientRect();
	const x = clamp(clientPoint.x, rect.left, rect.right);
	const y = clamp(clientPoint.y, rect.top, rect.bottom);

	return {
		x: x - rect.left + viewport.scrollLeft,
		y: y - rect.top + viewport.scrollTop,
	};
}

function toClampedViewportPoint(viewport: HTMLElement, clientPoint: Point): Point {
	const rect = viewport.getBoundingClientRect();

	return {
		x: clamp(clientPoint.x, rect.left, rect.right),
		y: clamp(clientPoint.y, rect.top, rect.bottom),
	};
}

function getVectorContentPoint(session: DragSession): Point {
	const latestClientPoint = toClampedViewportPoint(session.viewport, session.latestClientPoint);
	const startClientPoint = toClampedViewportPoint(session.viewport, session.startClientPoint);
	const scroll = getScrollPoint(session.viewport);

	return {
		x: session.startContentPoint.x + (latestClientPoint.x - startClientPoint.x) + (scroll.left - session.startScroll.left),
		y: session.startContentPoint.y + (latestClientPoint.y - startClientPoint.y) + (scroll.top - session.startScroll.top),
	};
}

function makeBox(start: Point, current: Point): DragSelectionBox {
	const left = Math.min(start.x, current.x);
	const top = Math.min(start.y, current.y);
	const right = Math.max(start.x, current.x);
	const bottom = Math.max(start.y, current.y);

	return {
		left,
		top,
		width: right - left,
		height: bottom - top,
	};
}

function elementRectToContentRect(viewport: HTMLElement, element: HTMLElement): DragSelectionBox {
	const viewportRect = viewport.getBoundingClientRect();
	const elementRect = element.getBoundingClientRect();

	return {
		left: elementRect.left - viewportRect.left + viewport.scrollLeft,
		top: elementRect.top - viewportRect.top + viewport.scrollTop,
		width: elementRect.width,
		height: elementRect.height,
	};
}

function rectsIntersect(a: DragSelectionBox, b: DragSelectionBox) {
	return (
		a.left < b.left + b.width && a.left + a.width > b.left && a.top < b.top + b.height && a.top + a.height > b.top
	);
}

function collectSelectableItemRects(viewport: HTMLElement, itemSelector: string) {
	const elements = Array.from(viewport.querySelectorAll<HTMLElement>(itemSelector));
	const rects: SelectableItemRect[] = [];

	for (const element of elements) {
		const id = element.dataset.selectableId;
		if (!id) continue;

		const rect = elementRectToContentRect(viewport, element);
		rects.push({ id, ...rect });
	}

	return rects;
}

function getSelectableIdsInBox(itemRects: SelectableItemRect[], box: DragSelectionBox) {
	const ids: string[] = [];

	for (const rect of itemRects) {
		if (rectsIntersect(box, rect)) {
			ids.push(rect.id);
		}
	}

	return ids;
}

function getScrollViewport(root: HTMLElement | null) {
	if (!root) return null;

	return root.querySelector<HTMLElement>("[data-slot='scroll-area-viewport']");
}

function trySetPointerCapture(element: HTMLElement, pointerId: number) {
	try {
		element.setPointerCapture(pointerId);
	} catch {
		// Pointer capture can fail if the pointer is already gone. The drag will still clean up on cancel/blur.
	}
}

function tryReleasePointerCapture(element: HTMLElement, pointerId: number) {
	try {
		if (element.hasPointerCapture(pointerId)) {
			element.releasePointerCapture(pointerId);
		}
	} catch {
		// Ignore browser-specific release timing.
	}
}

export function useDragSelection({
	scrollAreaRootRef,
	selectedIds,
	onSelectionChange,
	itemSelector = "[data-selectable-id]",
	disabled = false,
	minDragDistance = 5,
	wheelAutoScrollPauseMs = 220,
}: UseDragSelectionOptions) {
	const [selectionBox, setSelectionBox] = React.useState<DragSelectionBox | null>(null);
	const [isDragging, setIsDragging] = React.useState(false);

	const sessionRef = React.useRef<DragSession | null>(null);
	const lastAppliedSelectionKeyRef = React.useRef("");
	const didDragRef = React.useRef(false);
	const ignoreNextClickRef = React.useRef(false);
	const previousBodyUserSelectRef = React.useRef<string | null>(null);
	const clickSuppressCleanupRef = React.useRef<(() => void) | null>(null);
	const autoScrollPausedUntilRef = React.useRef(0);
	const autoScrollResumeTimeoutRef = React.useRef<number | null>(null);
	const rafRef = React.useRef<number | null>(null);
	const autoScrollRafRef = React.useRef<number | null>(null);
	const cleanupRef = React.useRef<(() => void) | null>(null);

	const stopAutoScrollLoop = React.useCallback(() => {
		if (autoScrollRafRef.current == null) return;

		window.cancelAnimationFrame(autoScrollRafRef.current);
		autoScrollRafRef.current = null;
	}, []);

	const cleanup = React.useCallback(() => {
		cleanupRef.current?.();
		cleanupRef.current = null;

		if (rafRef.current != null) {
			window.cancelAnimationFrame(rafRef.current);
			rafRef.current = null;
		}

		stopAutoScrollLoop();

		if (autoScrollResumeTimeoutRef.current != null) {
			window.clearTimeout(autoScrollResumeTimeoutRef.current);
			autoScrollResumeTimeoutRef.current = null;
		}

		const session = sessionRef.current;
		if (session) {
			tryReleasePointerCapture(session.target, session.pointerId);
		}

		sessionRef.current = null;
		lastAppliedSelectionKeyRef.current = "";
		autoScrollPausedUntilRef.current = 0;

		if (previousBodyUserSelectRef.current != null) {
			document.body.style.userSelect = previousBodyUserSelectRef.current;
			previousBodyUserSelectRef.current = null;
		}

		setSelectionBox(null);
		setIsDragging(false);
	}, [stopAutoScrollLoop]);

	const suppressNextNativeClick = React.useCallback(() => {
		clickSuppressCleanupRef.current?.();

		const onClick = (clickEvent: MouseEvent) => {
			clickEvent.preventDefault();
			clickEvent.stopPropagation();
			clickEvent.stopImmediatePropagation();
			ignoreNextClickRef.current = false;
			clickSuppressCleanupRef.current?.();
		};

		const timeout = window.setTimeout(() => {
			ignoreNextClickRef.current = false;
			clickSuppressCleanupRef.current?.();
		}, 250);

		window.addEventListener("click", onClick, { capture: true, once: true });
		clickSuppressCleanupRef.current = () => {
			window.clearTimeout(timeout);
			window.removeEventListener("click", onClick, { capture: true });
			clickSuppressCleanupRef.current = null;
		};
	}, []);

	const commitSelection = React.useCallback(
		(ids: string[]) => {
			const key = ids.join("\u0000");
			if (key === lastAppliedSelectionKeyRef.current) return;

			lastAppliedSelectionKeyRef.current = key;
			onSelectionChange(ids);
		},
		[onSelectionChange],
	);

	const applySelection = React.useCallback(
		(session: DragSession, box: DragSelectionBox) => {
			const touchedIds = getSelectableIdsInBox(session.itemRects, box);

			if (session.additive) {
				const next = new Set(session.initialSelected);

				for (const id of touchedIds) {
					next.add(id);
				}

				commitSelection(Array.from(next));
				return;
			}

			commitSelection(touchedIds);
		},
		[commitSelection],
	);

	const updateBoxFromSession = React.useCallback(() => {
		const session = sessionRef.current;
		if (!session) return;

		const currentContentPoint = getVectorContentPoint(session);
		const box = makeBox(session.startContentPoint, currentContentPoint);

		setSelectionBox(box);
		applySelection(session, box);
	}, [applySelection]);

	const scheduleUpdate = React.useCallback(() => {
		if (rafRef.current != null) {
			window.cancelAnimationFrame(rafRef.current);
		}

		rafRef.current = window.requestAnimationFrame(() => {
			rafRef.current = null;
			updateBoxFromSession();
		});
	}, [updateBoxFromSession]);

	const runAutoScroll = React.useCallback(() => {
		const session = sessionRef.current;
		if (!session || !didDragRef.current) return;

		const rect = session.viewport.getBoundingClientRect();
		const edgeSize = 72;
		const maxSpeed = 28;
		const latestClientPoint = session.latestClientPoint;
		let deltaY = 0;

		if (performance.now() < autoScrollPausedUntilRef.current) {
			autoScrollRafRef.current = window.requestAnimationFrame(runAutoScroll);
			return;
		}

		if (latestClientPoint.y < rect.top + edgeSize) {
			const intensity = 1 - (latestClientPoint.y - rect.top) / edgeSize;
			deltaY = -maxSpeed * Math.max(0, Math.min(1, intensity));
		} else if (latestClientPoint.y > rect.bottom - edgeSize) {
			const intensity = 1 - (rect.bottom - latestClientPoint.y) / edgeSize;
			deltaY = maxSpeed * Math.max(0, Math.min(1, intensity));
		}

		if (deltaY !== 0) {
			session.viewport.scrollTop += deltaY;
			updateBoxFromSession();
		}

		autoScrollRafRef.current = window.requestAnimationFrame(runAutoScroll);
	}, [updateBoxFromSession]);

	const startAutoScrollLoop = React.useCallback(() => {
		if (autoScrollRafRef.current != null) return;

		autoScrollRafRef.current = window.requestAnimationFrame(runAutoScroll);
	}, [runAutoScroll]);

	const startDragging = React.useCallback(() => {
		if (didDragRef.current) return;

		const session = sessionRef.current;
		if (!session) return;

		didDragRef.current = true;
		ignoreNextClickRef.current = true;
		trySetPointerCapture(session.target, session.pointerId);
		previousBodyUserSelectRef.current = document.body.style.userSelect;
		document.body.style.userSelect = "none";
		setIsDragging(true);
		startAutoScrollLoop();
		updateBoxFromSession();
	}, [startAutoScrollLoop, updateBoxFromSession]);

	const handlePointerDown = React.useCallback(
		(event: React.PointerEvent<HTMLElement>) => {
			if (disabled) return;
			if (event.button !== 0) return;

			const viewport = getScrollViewport(scrollAreaRootRef.current);
			if (!viewport) return;
			if (isInteractiveElement(event.target)) return;

			const target = event.currentTarget;
			const startClientPoint = {
				x: event.clientX,
				y: event.clientY,
			};

			sessionRef.current = {
				additive: event.ctrlKey || event.metaKey,
				initialSelected: new Set(selectedIds),
				itemRects: collectSelectableItemRects(viewport, itemSelector),
				latestClientPoint: startClientPoint,
				pointerId: event.pointerId,
				startClientPoint,
				startContentPoint: toContentPoint(viewport, startClientPoint),
				startScroll: getScrollPoint(viewport),
				target,
				viewport,
			};
			lastAppliedSelectionKeyRef.current = "";
			didDragRef.current = false;
			autoScrollPausedUntilRef.current = 0;
		},
		[disabled, itemSelector, scrollAreaRootRef, selectedIds],
	);

	const handlePointerMove = React.useCallback(
		(event: React.PointerEvent<HTMLElement>) => {
			const session = sessionRef.current;
			if (!session || session.pointerId !== event.pointerId) return;

			const latestClientPoint = {
				x: event.clientX,
				y: event.clientY,
			};

			session.latestClientPoint = latestClientPoint;

			if (!didDragRef.current && distance(session.startClientPoint, latestClientPoint) < minDragDistance) {
				return;
			}

			startDragging();
			event.preventDefault();
			scheduleUpdate();
		},
		[minDragDistance, scheduleUpdate, startDragging],
	);

	const handlePointerEnd = React.useCallback(
		(event: React.PointerEvent<HTMLElement>) => {
			const session = sessionRef.current;
			if (!session || session.pointerId !== event.pointerId) return;

			if (didDragRef.current) {
				ignoreNextClickRef.current = true;
				suppressNextNativeClick();
			}

			cleanup();
		},
		[cleanup, suppressNextNativeClick],
	);

	const handleClickCapture = React.useCallback((event: React.MouseEvent<HTMLElement>) => {
		if (!ignoreNextClickRef.current) return;

		event.preventDefault();
		event.stopPropagation();

		window.setTimeout(() => {
			ignoreNextClickRef.current = false;
		}, 0);
	}, []);

	React.useEffect(() => {
		const viewport = getScrollViewport(scrollAreaRootRef.current);
		if (!viewport) return;

		const onWheel = () => {
			if (!didDragRef.current) return;

			autoScrollPausedUntilRef.current = performance.now() + wheelAutoScrollPauseMs;
			stopAutoScrollLoop();
			updateBoxFromSession();

			if (autoScrollResumeTimeoutRef.current != null) {
				window.clearTimeout(autoScrollResumeTimeoutRef.current);
			}

			autoScrollResumeTimeoutRef.current = window.setTimeout(() => {
				autoScrollResumeTimeoutRef.current = null;
				if (didDragRef.current) {
					startAutoScrollLoop();
				}
			}, wheelAutoScrollPauseMs);
		};

		const onScroll = () => {
			if (!didDragRef.current) return;

			updateBoxFromSession();
		};

		viewport.addEventListener("wheel", onWheel, { passive: true });
		viewport.addEventListener("scroll", onScroll, { passive: true });

		return () => {
			viewport.removeEventListener("wheel", onWheel);
			viewport.removeEventListener("scroll", onScroll);
		};
	}, [
		scrollAreaRootRef,
		startAutoScrollLoop,
		stopAutoScrollLoop,
		updateBoxFromSession,
		wheelAutoScrollPauseMs,
	]);

	React.useEffect(() => {
		const onKeyDown = (keyboardEvent: KeyboardEvent) => {
			const session = sessionRef.current;
			if (!session || keyboardEvent.key !== "Escape") return;

			onSelectionChange(Array.from(session.initialSelected));
			cleanup();
		};

		const onBlur = () => {
			if (!sessionRef.current) return;

			cleanup();
		};

		window.addEventListener("keydown", onKeyDown);
		window.addEventListener("blur", onBlur);

		return () => {
			window.removeEventListener("keydown", onKeyDown);
			window.removeEventListener("blur", onBlur);
		};
	}, [cleanup, onSelectionChange]);

	React.useEffect(() => {
		return cleanup;
	}, [cleanup]);

	return {
		isDragging,
		selectionBox,
		containerProps: {
			onClickCapture: handleClickCapture,
			onPointerCancel: handlePointerEnd,
			onPointerDown: handlePointerDown,
			onPointerMove: handlePointerMove,
			onPointerUp: handlePointerEnd,
		},
	};
}

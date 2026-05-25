import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { motion } from "motion/react";

import { cn } from "@workspace/ui/lib/utils";

export type FilterTabItem<T extends string = string> = {
	value: T;
	label: React.ReactNode;
	count?: number;
	disabled?: boolean;
};

type FilterTabsProps<T extends string = string> = {
	value: T;
	items: FilterTabItem<T>[];
	onValueChange: (value: T) => void;
	className?: string;
	triggerClassName?: string;
	indicatorClassName?: string;
};

const INDICATOR_TRANSITION = {
	type: "spring",
	duration: 0.42,
	bounce: 0.08,
} as const;

function getIndicatorRect(list: HTMLElement, trigger: HTMLElement) {
	const listRect = list.getBoundingClientRect();
	const triggerRect = trigger.getBoundingClientRect();

	return {
		width: triggerRect.width,
		x: triggerRect.left - listRect.left + list.scrollLeft,
	};
}

export function FilterTabs<T extends string>({
	value,
	items,
	onValueChange,
	className,
	triggerClassName,
	indicatorClassName,
}: FilterTabsProps<T>) {
	const listRef = useRef<HTMLDivElement | null>(null);
	const triggerRefs = useRef(new Map<string, HTMLButtonElement>());
	const [indicatorRect, setIndicatorRect] = useState<{
		width: number;
		x: number;
	} | null>(null);

	const activeItem = items.find((item) => item.value === value);

	const updateIndicator = useCallback(() => {
		const list = listRef.current;
		const trigger = triggerRefs.current.get(value);

		if (!list || !trigger) {
			setIndicatorRect(null);
			return;
		}

		setIndicatorRect(getIndicatorRect(list, trigger));
	}, [value]);

	useLayoutEffect(() => {
		updateIndicator();
	}, [items, updateIndicator]);

	useEffect(() => {
		const list = listRef.current;
		const trigger = triggerRefs.current.get(value);

		if (!list || !trigger) return;

		const resizeObserver = new ResizeObserver(updateIndicator);

		resizeObserver.observe(list);
		resizeObserver.observe(trigger);

		list.addEventListener("scroll", updateIndicator, { passive: true });
		window.addEventListener("resize", updateIndicator);

		return () => {
			resizeObserver.disconnect();
			list.removeEventListener("scroll", updateIndicator);
			window.removeEventListener("resize", updateIndicator);
		};
	}, [value, updateIndicator]);

	return (
		<div
			ref={listRef}
			role="tablist"
			aria-label="Transfer filters"
			className={cn(
				"relative isolate inline-flex h-9 max-w-full items-center justify-start gap-1 overflow-x-auto rounded-lg bg-muted p-[3px] text-muted-foreground",
				"[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
				className,
			)}
			onClick={(event) => event.stopPropagation()}
		>
			{indicatorRect && activeItem ? (
				<motion.span
					aria-hidden="true"
					className={cn(
						"pointer-events-none absolute top-[3px] bottom-[3px] left-0 z-0 rounded-md bg-background shadow-sm dark:bg-input/30",
						indicatorClassName,
					)}
					initial={false}
					animate={{
						width: indicatorRect.width,
						x: indicatorRect.x,
					}}
					transition={INDICATOR_TRANSITION}
				/>
			) : null}

			{items.map((item) => {
				const active = item.value === value;

				return (
					<button
						key={item.value}
						ref={(node) => {
							if (node) {
								triggerRefs.current.set(item.value, node);
								return;
							}

							triggerRefs.current.delete(item.value);
						}}
						type="button"
						role="tab"
						aria-selected={active}
						disabled={item.disabled}
						onClick={() => onValueChange(item.value)}
						className={cn(
							"relative z-10 inline-flex h-[calc(100%-1px)] flex-none items-center justify-center gap-1.5 rounded-md border border-transparent px-3 py-1 text-sm font-medium whitespace-nowrap",
							"transition-colors focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none",
							"disabled:pointer-events-none disabled:opacity-50",
							active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
							triggerClassName,
						)}
					>
						<span>{item.label}</span>

						{typeof item.count === "number" ? (
							<span
								className={cn(
									"rounded-sm px-1 text-[10px] tabular-nums transition-colors",
									active
										? "bg-muted text-muted-foreground"
										: "bg-background/60 text-muted-foreground",
								)}
							>
								{item.count}
							</span>
						) : null}
					</button>
				);
			})}
		</div>
	);
}

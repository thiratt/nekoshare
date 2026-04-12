import * as React from "react";

import { AnimatePresence, motion, type Variants } from "motion/react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { cn } from "@workspace/ui/lib/utils";

export interface NTabItem {
	content: React.ReactNode;
	disabled?: boolean;
	label: React.ReactNode;
	value: string;
}

export interface NTabsProps
	extends Omit<React.ComponentProps<typeof Tabs>, "children" | "defaultValue" | "onValueChange" | "value"> {
	contentClassName?: string;
	defaultValue?: string;
	items: NTabItem[];
	listClassName?: string;
	onValueChange?: (value: string) => void;
	triggerClassName?: string;
	value?: string;
	viewportClassName?: string;
}

const TAB_INDICATOR_TRANSITION = {
	bounce: 0.08,
	duration: 0.42,
	type: "spring",
} as const;

const TAB_CONTENT_TRANSITION = {
	duration: 0.4,
	ease: [0.16, 1, 0.3, 1],
} as const;

const TAB_CONTENT_VARIANTS: Variants = {
	center: {
		opacity: 1,
		position: "relative",
		x: 0,
	},
	enter: (direction: number) => ({
		opacity: 0,
		position: "relative",
		x: direction >= 0 ? 24 : -24,
	}),
	exit: (direction: number) => ({
		inset: 0,
		opacity: 0,
		position: "absolute",
		x: direction >= 0 ? -24 : 24,
	}),
};

function getFallbackValue(items: NTabItem[]): string {
	return items.find((item) => !item.disabled)?.value ?? items[0]?.value ?? "";
}

function getTabIndex(items: NTabItem[], value: string): number {
	return items.findIndex((item) => item.value === value);
}

function getIndicatorRect(list: HTMLElement, trigger: HTMLElement): { width: number; x: number } {
	const listRect = list.getBoundingClientRect();
	const triggerRect = trigger.getBoundingClientRect();

	return {
		width: triggerRect.width,
		x: triggerRect.left - listRect.left + list.scrollLeft,
	};
}

export function NTabs({
	className,
	contentClassName,
	defaultValue,
	items,
	listClassName,
	onValueChange,
	triggerClassName,
	value,
	viewportClassName,
	...props
}: NTabsProps) {
	const fallbackValue = React.useMemo(() => getFallbackValue(items), [items]);
	const [internalValue, setInternalValue] = React.useState(defaultValue ?? fallbackValue);
	const activeValue = value ?? internalValue;
	const activeIndex = getTabIndex(items, activeValue);
	const activeItem = activeIndex >= 0 ? items[activeIndex] : null;
	const previousActiveIndexRef = React.useRef(activeIndex);
	const listRef = React.useRef<HTMLDivElement | null>(null);
	const triggerRefs = React.useRef(new Map<string, HTMLButtonElement>());
	const [direction, setDirection] = React.useState(1);
	const [indicatorRect, setIndicatorRect] = React.useState<{ width: number; x: number } | null>(null);

	const resolvedDirection =
		activeIndex >= 0 && previousActiveIndexRef.current >= 0 && activeIndex !== previousActiveIndexRef.current
			? activeIndex > previousActiveIndexRef.current
				? 1
				: -1
			: direction;

	React.useEffect(() => {
		if (value !== undefined || activeIndex >= 0 || !fallbackValue) {
			return;
		}

		setInternalValue(fallbackValue);
	}, [activeIndex, fallbackValue, value]);

	React.useEffect(() => {
		const previousIndex = previousActiveIndexRef.current;
		if (activeIndex >= 0 && previousIndex >= 0 && activeIndex !== previousIndex) {
			setDirection(activeIndex > previousIndex ? 1 : -1);
		}

		if (activeIndex >= 0) {
			previousActiveIndexRef.current = activeIndex;
		}
	}, [activeIndex]);

	const updateIndicator = React.useCallback(() => {
		const list = listRef.current;
		const trigger = triggerRefs.current.get(activeValue);
		if (!list || !trigger) {
			setIndicatorRect(null);
			return;
		}

		setIndicatorRect(getIndicatorRect(list, trigger));
	}, [activeValue]);

	React.useLayoutEffect(() => {
		updateIndicator();
	}, [items, updateIndicator]);

	React.useEffect(() => {
		const list = listRef.current;
		const trigger = triggerRefs.current.get(activeValue);
		if (!list || !trigger) {
			return;
		}

		const resizeObserver = new ResizeObserver(updateIndicator);
		resizeObserver.observe(list);
		resizeObserver.observe(trigger);
		window.addEventListener("resize", updateIndicator);

		return () => {
			resizeObserver.disconnect();
			window.removeEventListener("resize", updateIndicator);
		};
	}, [activeValue, updateIndicator]);

	const handleValueChange = React.useCallback(
		(nextValue: string) => {
			const nextIndex = getTabIndex(items, nextValue);
			if (nextIndex >= 0 && activeIndex >= 0 && nextIndex !== activeIndex) {
				setDirection(nextIndex > activeIndex ? 1 : -1);
			}

			if (value === undefined) {
				setInternalValue(nextValue);
			}

			onValueChange?.(nextValue);
		},
		[activeIndex, items, onValueChange, value],
	);

	return (
		<Tabs className={cn("min-w-0", className)} value={activeValue} onValueChange={handleValueChange} {...props}>
			<TabsList
				ref={listRef}
				className={cn(
					"relative isolate max-w-full justify-start gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
					listClassName,
				)}
			>
				{indicatorRect && (
					<motion.span
						aria-hidden="true"
						className="pointer-events-none absolute top-[3px] bottom-[3px] left-0 z-0 rounded-md bg-background shadow-sm dark:bg-input/30"
						initial={false}
						animate={{
							width: indicatorRect.width,
							x: indicatorRect.x,
						}}
						transition={TAB_INDICATOR_TRANSITION}
					/>
				)}

				{items.map((item) => (
					<TabsTrigger
						key={item.value}
						ref={(node) => {
							if (node) {
								triggerRefs.current.set(item.value, node);
								return;
							}

							triggerRefs.current.delete(item.value);
						}}
						value={item.value}
						disabled={item.disabled}
						className={cn(
							"relative z-10 flex-none overflow-hidden data-[state=active]:border-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none dark:data-[state=active]:border-transparent dark:data-[state=active]:bg-transparent",
							triggerClassName,
						)}
					>
						<span className="relative z-10">{item.label}</span>
					</TabsTrigger>
				))}
			</TabsList>

			{activeItem && (
				<TabsContent className={cn("min-w-0 overflow-hidden", viewportClassName)} forceMount value={activeValue}>
					<div className="relative overflow-hidden">
						<AnimatePresence custom={resolvedDirection} initial={false} mode="sync">
							<motion.div
								key={activeItem.value}
								custom={resolvedDirection}
								variants={TAB_CONTENT_VARIANTS}
								initial="enter"
								animate="center"
								exit="exit"
								transition={TAB_CONTENT_TRANSITION}
								className={contentClassName}
							>
								{activeItem.content}
							</motion.div>
						</AnimatePresence>
					</div>
				</TabsContent>
			)}
		</Tabs>
	);
}

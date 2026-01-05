"use client";

import * as React from "react";

import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";

import { cn } from "@workspace/ui/lib/utils";

function ScrollArea({ className, children, ...props }: React.ComponentProps<typeof ScrollAreaPrimitive.Root>) {
	return (
		<ScrollAreaPrimitive.Root
			data-slot="scroll-area"
			className={cn("relative overflow-hidden", className)}
			{...props}
		>
			<ScrollAreaPrimitive.Viewport
				data-slot="scroll-area-viewport"
				className="focus-visible:ring-ring/50 size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:outline-1"
			>
				{children}
			</ScrollAreaPrimitive.Viewport>
			<ScrollBar />
			<ScrollAreaPrimitive.Corner />
		</ScrollAreaPrimitive.Root>
	);
}

function ScrollBar({
	className,
	barClassname,
	orientation = "vertical",
	...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar> & {
	barClassname?: string;
}) {
	return (
		<ScrollAreaPrimitive.ScrollAreaScrollbar
			data-slot="scroll-area-scrollbar"
			orientation={orientation}
			className={cn(
				"flex touch-none p-px transition-colors select-none",
				orientation === "vertical" && "h-full w-2.5 border-l border-l-transparent",
				orientation === "vertical" &&
					"data-[state=visible]:animate-in data-[state=visible]:slide-in-from-right-1 data-[state=visible]:fade-in-0",
				orientation === "vertical" &&
					"data-[state=hidden]:animate-out data-[state=hidden]:slide-out-to-right-1 data-[state=hidden]:fade-out-0",
				orientation === "horizontal" && "w-full h-2.5 border-t border-t-transparent",
				orientation === "horizontal" &&
					"data-[state=visible]:animate-in data-[state=visible]:slide-in-from-bottom-1 data-[state=visible]:fade-in-0",
				orientation === "horizontal" &&
					"data-[state=hidden]:animate-out data-[state=hidden]:slide-out-to-bottom-1 data-[state=hidden]:fade-out-0",
				orientation === "horizontal" && "h-2.5 flex-col border-t border-t-transparent",
				className
			)}
			{...props}
		>
			<ScrollAreaPrimitive.ScrollAreaThumb
				data-slot="scroll-area-thumb"
				className={cn("bg-primary/80 relative flex-1 rounded-full", barClassname)}
			/>
		</ScrollAreaPrimitive.ScrollAreaScrollbar>
	);
}

export { ScrollArea, ScrollBar };

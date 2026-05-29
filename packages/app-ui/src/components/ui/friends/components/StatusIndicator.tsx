import { memo } from "react";

import { cn } from "@workspace/ui/lib/utils";

type StatusIndicatorProps = {
	isOnline?: boolean;
	size?: "sm" | "md";
};

export const StatusIndicator = memo(function StatusIndicator({ isOnline, size = "sm" }: StatusIndicatorProps) {
	const sizeClass = size === "sm" ? "w-2.5 h-2.5" : "w-3 h-3";

	return (
		<span
			className={cn(
				sizeClass,
				"absolute right-0 bottom-0 rounded-full border-2 border-background",
				isOnline ? "bg-emerald-500" : "bg-neutral-300 dark:bg-neutral-600",
			)}
			aria-label={isOnline ? "Online" : "Offline"}
		/>
	);
});

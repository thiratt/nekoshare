// components/StorageUsage.tsx
import * as React from "react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";
import { RefreshCcw, HardDrive } from "lucide-react";
import { useDeviceStorage, formatBytes } from "@workspace/app-ui/hooks/use-device-storage";
import { Progress } from "@workspace/ui/components/progress";
import { Button } from "@workspace/ui/components/button";

export function StorageUsageInline(): React.JSX.Element {
	const { used, quota, loading, supported, refresh } = useDeviceStorage();

	const pct = React.useMemo(() => {
		if (!used || !quota) return 0;
		return Math.min(100, Math.max(0, (used / quota) * 100));
	}, [used, quota]);

	// color thresholds
	const barClass = React.useMemo(() => {
		if (pct >= 90) return "bg-destructive";
		if (pct >= 70) return "bg-amber-500";
		return "bg-primary";
	}, [pct]);

	const label = supported
		? loading
			? "Checking storage…"
			: `ที่เก็บข้อมูล: ${formatBytes(used ?? 0)} / ${formatBytes(quota ?? 0)} (${Math.round(pct)}%)`
		: "Storage usage unavailable";

	return (
		<div className="flex items-center gap-3 min-w-[240px]">
			<HardDrive className="w-4 h-4 text-muted-foreground" />
			<div className="flex-1">
				<div className="flex items-center justify-between">
					<span className="text-xs text-muted-foreground">{label}</span>
					<Button
						className="size-4 hover:bg-primary/20 rounded-full"
						type="button"
						variant="ghost"
						onClick={refresh}
						aria-label="Refresh storage usage"
						title="Refresh"
					>
						<RefreshCcw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
					</Button>
				</div>

				{/* progress track */}
				<Tooltip>
					<Tooltip>
						<TooltipTrigger asChild>
							{/* focusable wrapper so TooltipTrigger gets a ref */}
							<span className="inline-flex w-full" tabIndex={0} aria-label="Storage usage">
								<Progress className={barClass} value={Math.round(pct)} />
							</span>
						</TooltipTrigger>
						<TooltipContent>
							<div className="text-xs">
								<div>
									<strong>Used:</strong> {formatBytes(used ?? 0)}
								</div>
								<div>
									<strong>Total:</strong> {formatBytes(quota ?? 0)}
								</div>
								<div>
									<strong>Free:</strong> {formatBytes(Math.max(0, (quota ?? 0) - (used ?? 0)))}
								</div>
							</div>
						</TooltipContent>
					</Tooltip>
					{supported && !loading && (
						<TooltipContent>
							<div className="text-xs">
								<div>
									<strong>Used:</strong> {formatBytes(used ?? 0)}
								</div>
								<div>
									<strong>Total:</strong> {formatBytes(quota ?? 0)}
								</div>
								<div>
									<strong>Free:</strong> {formatBytes(Math.max(0, (quota ?? 0) - (used ?? 0)))}
								</div>
							</div>
						</TooltipContent>
					)}
				</Tooltip>
			</div>
		</div>
	);
}

import { LuMonitor } from "react-icons/lu";

import { Button } from "@workspace/ui/components/button";

export function DeviceEmptyState({ hasFilter, onReset }: { hasFilter: boolean; onReset: () => void }) {
	return (
		<div className="flex h-full min-h-80 flex-col items-center justify-center p-8 text-center">
			<LuMonitor className="size-8 text-muted-foreground/50" />

			<p className="mt-3 text-sm font-medium">{hasFilter ? "No matching devices" : "No linked devices"}</p>

			<p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
				{hasFilter
					? "Try another search or reset the active filter."
					: "Link another device to send files securely between your devices."}
			</p>

			{hasFilter && (
				<Button type="button" variant="outline" size="sm" className="mt-4" onClick={onReset}>
					Reset filters
				</Button>
			)}
		</div>
	);
}

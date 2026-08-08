import { LuMonitor } from "react-icons/lu";

import { Button } from "@workspace/ui/components/button";

import { EmptyState } from "../../shared/EmptyState";

export function DeviceEmptyState({ hasFilter, onReset }: { hasFilter: boolean; onReset: () => void }) {
	if (hasFilter) {
		return (
			<EmptyState
				icon={<LuMonitor />}
				title="No matching devices"
				description="Try another search or reset the active filter."
				action={
					<Button variant="outline" onClick={onReset}>
						Clear filters
					</Button>
				}
			/>
		);
	}

	return (
		<EmptyState
			icon={<LuMonitor />}
			title="No linked devices"
			description="Link another device to send files securely between your devices."
		/>
	);
}

import { LuFileText, LuFilter, LuLoader, LuSend } from "react-icons/lu";

import { Button } from "@workspace/ui/components/button";

import { EmptyState } from "../../shared/EmptyState";
import type { TransferFilter } from "../types";

export function HomeTransferEmptyState({
	searchQuery,
	filter,
	loading,
	onReset,
}: {
	searchQuery: string;
	filter: TransferFilter;
	loading: boolean;
	onReset: () => void;
}) {
	if (loading) {
		return (
			<EmptyState
				icon={<LuLoader />}
				title="Loading transfers..."
				description="Your transfers will appear here in a moment."
			/>
		);
	}

	const filtered = searchQuery.length > 0 || filter !== "all";

	if (filtered) {
		return (
			<EmptyState
				icon={<LuFilter />}
				title="No transfers found"
				description="Try changing your search or filters."
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
			icon={<LuFileText />}
			title="No transfers yet"
			description="Drag files anywhere into this window, or use the button below to start sending."
			action={
				<Button>
					<LuSend />
					Send files
				</Button>
			}
		/>
	);
}

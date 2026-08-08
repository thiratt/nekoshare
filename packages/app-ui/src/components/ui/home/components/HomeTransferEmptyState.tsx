import { LuFileText, LuFilter, LuLoader, LuSend } from "react-icons/lu";

import { Button } from "@workspace/ui/components/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@workspace/ui/components/empty";

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
	const filtered = searchQuery.length > 0 || filter !== "all";

	return (
		<Empty className="h-full">
			<EmptyHeader>
				<EmptyMedia variant="icon">
					{loading ? <LuLoader /> : filtered ? <LuFilter /> : <LuFileText />}
				</EmptyMedia>

				<EmptyTitle>
					{loading ? "Loading transfers..." : filtered ? "No transfers found" : "No transfers yet"}
				</EmptyTitle>

				<EmptyDescription>
					{loading
						? "Your transfers will appear here in a moment."
						: filtered
							? "Try changing your search or filters."
							: "Drag files anywhere into this window, or use the button below to start sending."}
				</EmptyDescription>
			</EmptyHeader>

			<EmptyContent>
				{filtered ? (
					<Button variant="outline" onClick={onReset}>
						Clear filters
					</Button>
				) : (
					<Button>
						<LuSend />
						Send files
					</Button>
				)}
			</EmptyContent>
		</Empty>
	);
}

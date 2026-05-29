import { LuRefreshCcw } from "react-icons/lu";

import { Button } from "@workspace/ui/components/button";
import { SearchInput } from "@workspace/ui/components/search-input";
import { cn } from "@workspace/ui/lib/utils";

type DevicesToolbarProps = {
	loading: boolean;
	query: string;
	onClearSearch: () => void;
	onRefresh: () => void;
	onSearchQuery: (query: string) => void;
};

export function DevicesToolbar({ loading, onClearSearch, onRefresh, onSearchQuery, query }: DevicesToolbarProps) {
	return (
		<div className="mb-4 flex items-center gap-2">
			<Button type="button" variant="outline" size="icon" title="รีเฟรช" disabled={loading} onClick={onRefresh}>
				<LuRefreshCcw className={cn(loading && "animate-spin")} />
			</Button>
			<SearchInput
				placeholder="ค้นหาอุปกรณ์"
				className="flex-1"
				searchQuery={query}
				onSearchQuery={onSearchQuery}
				onClearSearch={onClearSearch}
			/>
		</div>
	);
}

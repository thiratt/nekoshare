import { LuRefreshCw } from "react-icons/lu";

import { Button } from "@workspace/ui/components/button";
import { SearchInput } from "@workspace/ui/components/search-input";
import { cn } from "@workspace/ui/lib/utils";

type FriendsToolbarProps = {
	loading: boolean;
	query: string;
	onClearSearch: () => void;
	onRefresh: () => void;
	onSearchQuery: (query: string) => void;
};

export function FriendsToolbar({ loading, onClearSearch, onRefresh, onSearchQuery, query }: FriendsToolbarProps) {
	return (
		<div className="mb-4 flex items-center gap-2">
			<Button type="button" variant="outline" size="icon" title="รีเฟรช" disabled={loading} onClick={onRefresh}>
				<LuRefreshCw className={cn(loading && "animate-spin")} />
			</Button>

			<SearchInput
				placeholder="ค้นหาเพื่อนด้วยชื่อหรืออีเมล"
				className="flex-1"
				searchQuery={query}
				onSearchQuery={onSearchQuery}
				onClearSearch={onClearSearch}
			/>
		</div>
	);
}

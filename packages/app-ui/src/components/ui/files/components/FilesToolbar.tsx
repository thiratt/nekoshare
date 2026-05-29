import { LuRefreshCcw } from "react-icons/lu";

import { Button } from "@workspace/ui/components/button";
import { SearchInput } from "@workspace/ui/components/search-input";

type FilesToolbarProps = {
	searchQuery: string;
	onSearchQuery: (query: string) => void;
	onClearSearch: () => void;
};

export function FilesToolbar({ onClearSearch, onSearchQuery, searchQuery }: FilesToolbarProps) {
	return (
		<div className="mb-6 flex flex-wrap items-center gap-2">
			<Button type="button" variant="outline" size="icon" title="รีเฟรช">
				<LuRefreshCcw />
			</Button>

			<div className="relative min-w-60 flex-1">
				<SearchInput
					placeholder="ค้นหาไฟล์ อุปกรณ์ หรือชนิดไฟล์"
					className="flex-1"
					searchQuery={searchQuery}
					onSearchQuery={onSearchQuery}
					onClearSearch={onClearSearch}
				/>
			</div>
		</div>
	);
}

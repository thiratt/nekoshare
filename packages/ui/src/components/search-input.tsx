import { Search, X } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { cn } from "@workspace/ui/lib/utils";

interface SearchInputProps {
	className?: string;
	searchQuery: string;
	placeholder?: string;
	onSearchQuery: (value: string) => void;
	onClearSearch: () => void;
}

function SearchInput({ className, searchQuery, placeholder, onSearchQuery, onClearSearch }: SearchInputProps) {
	return (
		<div className={cn("relative transition-all duration-300", className)}>
			{!searchQuery && (
				<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 animate-in zoom-in" />
			)}

			<Input
				placeholder={placeholder ? placeholder : "ค้นหา..."}
				value={searchQuery}
				onChange={(e) => onSearchQuery(e.target.value)}
				className={cn("transition-all", !searchQuery ? "pl-9" : "pr-7")}
				aria-label="Search input"
			/>

			{searchQuery && (
				<Button
					className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 animate-in zoom-in"
					variant="ghost"
					size="icon"
					onClick={onClearSearch}
					aria-label="Clear search"
				>
					<X className="w-4 h-4" />
				</Button>
			)}
		</div>
	);
}

export { SearchInput };

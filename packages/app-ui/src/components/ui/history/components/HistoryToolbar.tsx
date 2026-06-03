import { LuEllipsis, LuRefreshCcw, LuTrash2 } from "react-icons/lu";
import { TbDeselect, TbSelectAll } from "react-icons/tb";

import { Button } from "@workspace/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { SearchInput } from "@workspace/ui/components/search-input";
import { Separator } from "@workspace/ui/components/separator";

import { ExtendLink } from "@workspace/app-ui/components/ext/link";
import type { LinkComponent } from "@workspace/app-ui/types/link";

import { HISTORY_FILTER_ITEMS } from "../constants";
import { FilterTabs } from "./FilterTabs";
import type { HistoryTransfersController } from "../hooks/useHistoryTransfers";

type HistoryToolbarProps = {
	controller: HistoryTransfersController;
	linkComponent: LinkComponent;
	loading?: boolean;
};

export function HistoryToolbar({ controller, linkComponent, loading }: HistoryToolbarProps) {
	return (
		<div className="flex items-center gap-2">
			<div className="flex min-w-0 items-center gap-2">
				<Button
					type="button"
					variant="outline"
					size="icon"
					disabled={loading}
					title="รีเฟรช"
					onClick={(event) => {
						event.stopPropagation();
						controller.refreshData();
					}}
				>
					<LuRefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
				</Button>

				<SearchInput
					searchQuery={controller.query}
					onSearchQuery={controller.setQuery}
					onClearSearch={controller.clearSearch}
					className="w-64"
					placeholder="ค้นหาไฟล์ อุปกรณ์ หรือสถานะ..."
				/>

				<Separator orientation="vertical" />

				<FilterTabs
					value={controller.filter}
					onValueChange={controller.setFilter}
					items={HISTORY_FILTER_ITEMS}
				/>

				<Separator orientation="vertical" />

				<div className="flex items-center gap-1" onClick={(event) => event.stopPropagation()}>
					<Button
						type="button"
						variant="destructive"
						size="icon"
						title="ลบรายการที่เลือก"
						onClick={controller.handleRemoveSelected}
						disabled={!controller.selectedActionState.canRemove}
					>
						<LuTrash2 className="h-4 w-4" />
					</Button>

					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button type="button" variant="outline" size="icon" aria-label="ตัวเลือกเพิ่มเติม">
								<LuEllipsis className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>

						<DropdownMenuContent className="w-52" align="start">
							<DropdownMenuGroup>
								<DropdownMenuItem
									onSelect={() =>
										!controller.hasSelection ? controller.selectAll() : controller.clearSelection()
									}
								>
									{!controller.hasSelection ? <TbSelectAll /> : <TbDeselect />}
									{!controller.hasSelection ? "เลือกทั้งหมด" : "ยกเลิกการเลือกทั้งหมด"}
								</DropdownMenuItem>
							</DropdownMenuGroup>

						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>

			<div className="ms-auto flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
				<Button asChild>
					<ExtendLink href="/share/new" linkComponent={linkComponent} asButton>
						แชร์ไฟล์
					</ExtendLink>
				</Button>
			</div>
		</div>
	);
}

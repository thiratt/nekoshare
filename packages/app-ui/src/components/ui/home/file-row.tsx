import { memo } from "react";

import { flexRender, Row } from "@tanstack/react-table";
import { LuFile, LuFolderInput, LuTrash2, LuType } from "react-icons/lu";

import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from "@workspace/ui/components/context-menu";
import { TableCell, TableRow } from "@workspace/ui/components/table";

import type { ShareItem } from "@workspace/app-ui/types/home";

interface FileRowProps {
	row: Row<ShareItem>;
	onItemClick: (id: number) => void;
	onItemReveal: (id: number) => void;
	handleCopyFilename: (id: number) => void;
	handleItemDelete: (id: number) => void;
}

export const FileRow = memo(
	function FileRow({ row, onItemClick, onItemReveal, handleCopyFilename, handleItemDelete }: FileRowProps) {
		return (
			<ContextMenu>
				<ContextMenuTrigger asChild>
					<TableRow
						onClick={() => onItemClick(row.original.id)}
						data-state={row.getIsSelected() ? "selected" : undefined}
						className="cursor-pointer hover:bg-muted/50 data-[state=selected]:bg-muted"
					>
						{row.getVisibleCells().map((cell) => (
							<TableCell key={cell.id}>
								{flexRender(cell.column.columnDef.cell, cell.getContext())}
							</TableCell>
						))}
					</TableRow>
				</ContextMenuTrigger>

				<ContextMenuContent className="w-52">
					<ContextMenuItem>
						<LuFile className="mr-2 h-4 w-4" />
						คัดลอกไฟล์
					</ContextMenuItem>
					<ContextMenuItem onSelect={() => handleCopyFilename(row.original.id)}>
						<LuType className="mr-2 h-4 w-4" />
						คัดลอกชื่อไฟล์
					</ContextMenuItem>
					<ContextMenuSeparator />
					<ContextMenuItem onSelect={() => onItemReveal(row.original.id)}>
						<LuFolderInput className="mr-2 h-4 w-4" />
						เปิดตำแหน่งไฟล์
					</ContextMenuItem>
					<ContextMenuSeparator />
					<ContextMenuItem variant="destructive" onSelect={() => handleItemDelete(row.original.id)}>
						<LuTrash2 className="mr-2 h-4 w-4" />
						ลบ
					</ContextMenuItem>
				</ContextMenuContent>
			</ContextMenu>
		);
	},
	(prev, next) => {
		const isSelectionChanged = prev.row.getIsSelected() !== next.row.getIsSelected();
		const isDataChanged = prev.row.original !== next.row.original;

		return !isSelectionChanged && !isDataChanged;
	},
);

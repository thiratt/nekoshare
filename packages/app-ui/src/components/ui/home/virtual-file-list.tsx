import { memo, useCallback, useRef } from "react";

import { flexRender, type Row, type Table } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { LuFile, LuFolderInput, LuLoader, LuTrash2, LuType } from "react-icons/lu";

import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from "@workspace/ui/components/context-menu";
import { TableCell, TableRow } from "@workspace/ui/components/table";

import type { ShareItem } from "@workspace/app-ui/types/home";

const ROW_HEIGHT = 48;
const OVERSCAN_COUNT = 5;

interface VirtualFileRowProps {
	row: Row<ShareItem>;
	virtualRowIndex: number;
	virtualRowStart: number;
	onItemClick: (id: number) => void;
	onItemReveal: (id: number) => void;
	handleCopyFilename: (id: number) => void;
	handleItemDelete: (id: number) => void;
}

export const VirtualFileRow = memo(
	function VirtualFileRow({
		row,
		virtualRowStart,
		onItemClick,
		onItemReveal,
		handleCopyFilename,
		handleItemDelete,
	}: VirtualFileRowProps) {
		return (
			<ContextMenu>
				<ContextMenuTrigger asChild>
					<TableRow
						onClick={() => onItemClick(row.original.id)}
						data-state={row.getIsSelected() ? "selected" : undefined}
						className="cursor-pointer hover:bg-muted/50 data-[state=selected]:bg-muted absolute left-0 w-full flex items-center"
						style={{
							height: `${ROW_HEIGHT}px`,
							transform: `translateY(${virtualRowStart}px)`,
							willChange: "transform",
						}}
					>
						{row.getVisibleCells().map((cell) => (
							<TableCell
								key={cell.id}
								className="shrink-0"
								style={{ width: `${cell.column.getSize()}px` }}
							>
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
		return (
			prev.row.getIsSelected() === next.row.getIsSelected() &&
			prev.row.original.id === next.row.original.id &&
			prev.virtualRowStart === next.virtualRowStart &&
			prev.row.original === next.row.original
		);
	},
);

interface VirtualFileListProps {
	table: Table<ShareItem>;
	loading: boolean;
	onItemClick: (id: number) => void;
	onItemReveal: (id: number) => void;
	handleCopyFilename: (id: number) => void;
	handleItemDelete: (id: number) => void;
}

export const VirtualFileList = memo(function VirtualFileList({
	table,
	loading,
	onItemClick,
	onItemReveal,
	handleCopyFilename,
	handleItemDelete,
}: VirtualFileListProps) {
	const parentRef = useRef<HTMLDivElement>(null);
	const { rows } = table.getRowModel();

	const virtualizer = useVirtualizer({
		count: rows.length,
		getScrollElement: () => parentRef.current,
		estimateSize: useCallback(() => ROW_HEIGHT, []),
		overscan: OVERSCAN_COUNT,
		measureElement: undefined,
	});

	const virtualRows = virtualizer.getVirtualItems();
	const totalSize = virtualizer.getTotalSize();

	if (loading) {
		return (
			<div className="flex items-center justify-center py-8 text-muted-foreground gap-2 h-full">
				<LuLoader className="w-4 h-4 animate-spin" /> กำลังโหลด
			</div>
		);
	}

	if (rows.length === 0) {
		return <div className="flex items-center justify-center py-8 text-muted-foreground h-full">ไม่มีรายการ</div>;
	}

	return (
		<div
			ref={parentRef}
			className="flex-1 overflow-auto contain-strict"
			style={{
				contain: "strict",
			}}
		>
			<div
				className="relative w-full"
				style={{
					height: `${totalSize}px`,
				}}
			>
				{virtualRows.map((virtualRow) => {
					const row = rows[virtualRow.index];
					if (!row) return null;

					return (
						<VirtualFileRow
							key={row.id}
							row={row}
							virtualRowIndex={virtualRow.index}
							virtualRowStart={virtualRow.start}
							onItemClick={onItemClick}
							onItemReveal={onItemReveal}
							handleCopyFilename={handleCopyFilename}
							handleItemDelete={handleItemDelete}
						/>
					);
				})}
			</div>
		</div>
	);
});

export { OVERSCAN_COUNT, ROW_HEIGHT };

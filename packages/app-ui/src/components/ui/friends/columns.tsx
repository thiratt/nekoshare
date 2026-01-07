import { useMemo } from "react";

import type { ColumnDef } from "@tanstack/react-table";

import { Checkbox } from "@workspace/ui/components/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@workspace/ui/components/tooltip";

import type { FriendItem } from "@workspace/app-ui/types/friends";

import { FriendAvatarCell, FriendRowActions, SortableHeader, StatusBadge } from "./components";
import { formatDate } from "./constants";

interface UseColumnsOptions {
	onRemove: (friendshipId: string) => void;
}

export function useColumns({ onRemove }: UseColumnsOptions) {
	return useMemo<ColumnDef<FriendItem>[]>(
		() => [
			{
				id: "select",
				header: ({ table }) => (
					<Checkbox
						className="border-foreground"
						checked={
							table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")
						}
						onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
						aria-label="เลือกทั้งหมด"
					/>
				),
				cell: ({ row }) => (
					<Checkbox
						className="border-foreground"
						onClick={(e) => e.stopPropagation()}
						checked={row.getIsSelected()}
						onCheckedChange={(value) => row.toggleSelected(!!value)}
						aria-label={`เลือก ${row.original.name}`}
					/>
				),
				size: 40,
				enableSorting: false,
			},
			{
				accessorKey: "name",
				header: ({ column }) => <SortableHeader column={column} label="เพื่อน" />,
				size: 800,
				cell: ({ row }) => <FriendAvatarCell friend={row.original} />,
			},
			{
				accessorKey: "status",
				header: ({ column }) => <SortableHeader column={column} label="สถานะ" />,
				cell: ({ row }) => <StatusBadge status={row.original.status} />,
			},
			{
				accessorKey: "sharedCount",
				header: ({ column }) => <SortableHeader column={column} label="จำนวนการแชร์" />,
				cell: ({ row }) => <span className="tabular-nums font-medium">{row.original.sharedCount}</span>,
			},
			{
				accessorKey: "lastActive",
				header: ({ column }) => <SortableHeader column={column} label="ล่าสุดที่ใช้งาน" />,
				cell: ({ row }) => (
					<Tooltip>
						<TooltipTrigger asChild>
							<span className="text-sm text-muted-foreground cursor-default">
								{formatDate(row.original.lastActive)}
							</span>
						</TooltipTrigger>
						<TooltipContent>เพิ่มเมื่อ: {formatDate(row.original.createdAt)}</TooltipContent>
					</Tooltip>
				),
			},
			{
				id: "actions",
				header: "ตัวเลือก",
				enableSorting: false,
				cell: ({ row }) => (
					<FriendRowActions
						friend={row.original}
						onRemove={onRemove}
					/>
				),
			},
		],
		[onRemove]
	);
}

import { memo, useMemo } from "react";

import { type ColumnDef } from "@tanstack/react-table";
import { LuFolderInput, LuTrash2 } from "react-icons/lu";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";

import type { ShareItem } from "@workspace/app-ui/types/home";

import { formatDate,STATUS_CONFIG } from "./constants";

interface StatusBadgeProps {
	status: ShareItem["status"];
}

interface UseColumnsProps {
	onItemReveal: (id: number) => void;
	onItemDelete: (id: number) => void;
}

export const StatusBadge = memo(function StatusBadge({ status }: StatusBadgeProps) {
	const { icon: Icon, color, label } = STATUS_CONFIG[status];

	return (
		<Badge className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${color}`}>
			<Icon className="w-3 h-3" />
			{label}
		</Badge>
	);
});

export function useColumns({ onItemReveal, onItemDelete }: UseColumnsProps): ColumnDef<ShareItem>[] {
	return useMemo<ColumnDef<ShareItem>[]>(
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
						aria-label="Select all"
					/>
				),
				cell: ({ row }) => (
					<Checkbox
						className="border-foreground"
						onClick={(e) => e.stopPropagation()}
						checked={row.getIsSelected()}
						onCheckedChange={(value) => row.toggleSelected(!!value)}
						aria-label={`Select ${row.original.name}`}
					/>
				),
				size: 40,
				enableSorting: false,
			},
			{
				accessorKey: "name",
				header: "รายการ",
			},
			{
				accessorKey: "from",
				header: "จาก",
				cell: ({ row }) => (row.original.from === "me" ? "ฉัน" : "เพื่อน"),
			},
			{
				accessorKey: "device",
				header: "อุปกรณ์",
				cell: ({ row }) => row.original.device || "-",
			},
			{
				accessorKey: "size",
				header: "ขนาด",
				cell: ({ row }) => row.original.size ?? "-",
			},
			{
				accessorKey: "status",
				header: "สถานะ",
				cell: ({ row }) => <StatusBadge status={row.original.status} />,
			},
			{
				accessorKey: "uploadedAt",
				header: "วันที่",
				sortingFn: (a, b) =>
					new Date(a.original.uploadedAt).getTime() - new Date(b.original.uploadedAt).getTime(),
				cell: ({ row }) => (
					<span className="text-sm text-muted-foreground">{formatDate(row.original.uploadedAt)}</span>
				),
			},
			{
				id: "actions",
				header: "ตัวเลือก",
				enableSorting: false,
				cell: ({ row }) => (
					<div className="flex gap-1">
						{row.original.canDownload && (
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8 hover:bg-primary hover:text-primary-foreground dark:hover:bg-primary"
								onClick={(e) => {
									e.stopPropagation();
									onItemReveal(row.original.id);
								}}
								aria-label="Download item"
							>
								<LuFolderInput className="h-4 w-4" />
							</Button>
						)}
						<Button
							variant="ghost"
							size="icon"
							className="h-8 w-8 hover:bg-destructive hover:text-primary-foreground dark:hover:bg-destructive/60 dark:hover:text-foreground"
							onClick={(e) => {
								e.stopPropagation();
								onItemDelete(row.original.id);
							}}
							aria-label="Delete item"
						>
							<LuTrash2 className="h-4 w-4" />
						</Button>
					</div>
				),
			},
		],
		[onItemReveal, onItemDelete]
	);
}

import { memo, useMemo } from "react";

import { LuArrowUpDown, LuFolderInput, LuTrash2 } from "react-icons/lu";
import type { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@workspace/ui/components/tooltip";

import type { ShareItem } from "@workspace/app-ui/types/home";

import { formatDate, STATUS_CONFIG } from "./constants";
import { FileIcon } from "./icon";

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
				header: ({ column }) => {
					return (
						<div
							className="flex items-center gap-2"
							onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
						>
							ชื่อ
							<LuArrowUpDown />
						</div>
					);
				},
				cell: ({ row }) => {
					const name = row.original.name;
					const shouldNameCut = name.length > 40;

					return (
						<div className="flex items-center gap-2">
							<FileIcon type={row.original.type || "file"} />

							{shouldNameCut ? (
								<Tooltip delayDuration={300}>
									<TooltipTrigger asChild>
										<span className="cursor-help">{name.slice(0, 40)}...</span>
									</TooltipTrigger>
									<TooltipContent>
										<div className="max-w-md break-all whitespace-normal text-sm p-1">{name}</div>
									</TooltipContent>
								</Tooltip>
							) : (
								<span>{name}</span>
							)}
						</div>
					);
				},
			},
			{
				accessorKey: "from",
				header: ({ column }) => (
					<div
						className="flex items-center gap-2"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					>
						จาก
						<LuArrowUpDown />
					</div>
				),
				cell: ({ row }) => (row.original.from === "me" ? "ฉัน" : "เพื่อน"),
			},
			{
				accessorKey: "device",
				header: ({ column }) => (
					<div
						className="flex items-center gap-2"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					>
						อุปกรณ์
						<LuArrowUpDown />
					</div>
				),
				cell: ({ row }) => row.original.device || "-",
			},
			{
				accessorKey: "size",
				header: ({ column }) => (
					<div
						className="flex items-center gap-2"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					>
						ขนาด
						<LuArrowUpDown />
					</div>
				),
				cell: ({ row }) => row.original.size ?? "-",
			},
			{
				accessorKey: "status",
				header: ({ column }) => (
					<div
						className="flex items-center gap-2"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					>
						สถานะ
						<LuArrowUpDown />
					</div>
				),
				cell: ({ row }) => <StatusBadge status={row.original.status} />,
			},
			{
				accessorKey: "uploadedAt",
				header: ({ column }) => (
					<div
						className="flex items-center gap-2"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					>
						วันที่
						<LuArrowUpDown />
					</div>
				),
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

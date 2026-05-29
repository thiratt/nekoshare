import { memo, useMemo } from "react";

import { LuEllipsis, LuSettings2, LuTrash2, LuUserCheck } from "react-icons/lu";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";

import type { UiDevice } from "@workspace/app-ui/types/device";

import { capitalize } from "../utils/device-utils";
import { DeviceIcon } from "./DeviceIcon";
import { DeviceStatusBadge } from "./DeviceStatusBadge";

type DeviceRowProps = {
	device: UiDevice;
	onManage: (deviceId: string) => void;
	onDelete: (deviceId: string) => void;
	loading?: boolean;
};

export const DeviceRow = memo(function DeviceRow({ device, loading, onDelete, onManage }: DeviceRowProps) {
	const platformLabel = useMemo(() => capitalize(device.platform), [device.platform]);

	return (
		<div className="group flex items-center justify-between gap-4 rounded-2xl border bg-card px-4 py-3 shadow-sm transition-colors hover:bg-muted/40">
			<div className="flex min-w-0 items-center gap-3">
				<div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent">
					<DeviceIcon platform={device.platform} size={20} />
				</div>

				<div className="min-w-0">
					<div className="flex flex-wrap items-center gap-x-2 gap-y-1">
						<span className="truncate text-sm font-medium text-foreground">{device.name}</span>
						<span className="text-xs text-muted-foreground">{platformLabel}</span>
					</div>

					<div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
						{device.isCurrent ? (
							<Badge className="bg-amber-500 text-white dark:bg-amber-600" variant="secondary">
								<LuUserCheck className="fill-current" />
								เครื่องนี้
							</Badge>
						) : (
							<DeviceStatusBadge status={device.status} />
						)}

						<span>{device.lastSeen}</span>
						<span className="truncate" title={device.os}>
							{device.os}
						</span>
					</div>
				</div>
			</div>

			<div className="flex shrink-0 items-center gap-1">
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="rounded-full"
					disabled={loading}
					onClick={() => onManage(device.id)}
				>
					<LuSettings2 className="size-3.5" />
					ตั้งค่า
				</Button>

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="size-8 rounded-full"
							disabled={loading}
							title="เพิ่มเติม"
						>
							<LuEllipsis />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="w-44">
						<DropdownMenuItem onSelect={() => onManage(device.id)}>
							<LuSettings2 />
							แก้ไขชื่อ
						</DropdownMenuItem>
						{!device.isCurrent ? (
							<>
								<DropdownMenuSeparator />
								<DropdownMenuItem variant="destructive" onSelect={() => onDelete(device.id)}>
									<LuTrash2 />
									ลบอุปกรณ์
								</DropdownMenuItem>
							</>
						) : null}
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</div>
	);
});

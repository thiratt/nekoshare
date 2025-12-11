import { memo, useMemo } from "react";
import {
	LuBatteryCharging,
	LuBatteryFull,
	LuBatteryLow,
	LuBatteryMedium,
	LuCircle,
	LuCopy,
	LuSettings,
	LuTrash2,
	LuUserCheck,
} from "react-icons/lu";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";

import type { Device, DevicePlatform, DeviceStatus } from "@workspace/app-ui/types/device";
import { PLATFORM_ICONS, STATUS_CONFIG, BATTERY_THRESHOLDS, capitalize } from "./constants";

interface DeviceIconProps {
	platform: DevicePlatform;
	size?: number;
}

interface DeviceStatusBadgeProps {
	status: DeviceStatus;
}

interface DeviceBatteryIconProps {
	charging: boolean;
	percent: number;
}

interface DeviceCardProps {
	device: Device;
	onManage: (deviceId: string) => void;
	onDelete: (deviceId: string) => void;
}

export const DeviceIcon = memo(function DeviceIcon({ platform, size = 24 }: DeviceIconProps) {
	const IconComponent = PLATFORM_ICONS[platform];
	return <IconComponent size={size} />;
});

export const DeviceStatusBadge = memo(function DeviceStatusBadge({ status }: DeviceStatusBadgeProps) {
	const config = STATUS_CONFIG[status];
	return (
		<Badge className={cn("[&>svg]:size-1.5", config.className)} variant={config.variant}>
			<LuCircle className="size-1 fill-current" />
			{config.label}
		</Badge>
	);
});

export const DeviceBatteryIcon = memo(function DeviceBatteryIcon({ charging, percent }: DeviceBatteryIconProps) {
	const className = "w-4 h-4";

	if (charging) return <LuBatteryCharging className={className} />;
	if (percent <= BATTERY_THRESHOLDS.LOW) return <LuBatteryLow className={className} />;
	if (percent <= BATTERY_THRESHOLDS.MEDIUM) return <LuBatteryMedium className={className} />;
	return <LuBatteryFull className={className} />;
});

export const DeviceCard = memo(function DeviceCard({ device, onManage, onDelete }: DeviceCardProps) {
	const platformLabel = useMemo(() => capitalize(device.platform), [device.platform]);

	return (
		<Card className="dark:border-accent">
			<CardHeader className="flex justify-between">
				<div className="flex items-center gap-2">
					<div className="bg-foreground text-background p-2 rounded-full">
						<DeviceIcon platform={device.platform} />
					</div>
					<div className="space-y-1">
						<CardTitle>{device.name}</CardTitle>
						<CardDescription>{platformLabel}</CardDescription>
						{device.isCurrent ? (
							<Badge className="bg-amber-500 text-white dark:bg-amber-600" variant="secondary">
								<LuUserCheck className="fill-current" />
								เครื่องนี้
							</Badge>
						) : (
							<div className="flex gap-1">
								<DeviceStatusBadge status={device.status} />
							</div>
						)}
					</div>
				</div>
				{device.battery.supported && (
					<div className="space-y-1">
						<div className="flex items-center gap-1 text-muted-foreground justify-end">
							<DeviceBatteryIcon charging={device.battery.charging} percent={device.battery.percent} />
							<span>{device.battery.percent}%</span>
						</div>
					</div>
				)}
			</CardHeader>
			<CardContent>
				<div className="space-y-1 text-sm text-muted-foreground">
					<div className="flex justify-between">
						<span>ใช้งานล่าสุดเมื่อ</span>
						<span>{device.lastSeen}</span>
					</div>
					<div className="flex justify-between">
						<span>IP Address</span>
						<span className="truncate ml-2 max-w-32" title={device.ip}>
							{device.ip}
						</span>
					</div>
					<div className="flex justify-between">
						<span>ระบบปฏิบัติการ</span>
						<span className="truncate ml-2" title={device.os}>
							{device.os}
						</span>
					</div>
				</div>
			</CardContent>
			<CardFooter>
				<div className="pt-2 border-t flex gap-2 w-full">
					<Button className="flex-1" variant="outline" size="sm" onClick={() => onManage(device.id)}>
						<LuSettings />
						แก้ไข
					</Button>
					{!device.isCurrent && (
						<Button variant="destructive" size="sm" onClick={() => onDelete(device.id)}>
							<LuTrash2 />
							ลบ
						</Button>
					)}
				</div>
			</CardFooter>
		</Card>
	);
});

export const EmptyState = memo(function EmptyState() {
	return (
		<div
			className={cn(
				"h-[calc(100vh-14rem)] flex flex-col items-center justify-center",
				"border-2 border-dashed rounded-lg text-muted-foreground space-y-4"
			)}
		>
			<LuCopy className="w-8 h-8 mb-2" />
			<p>ไม่พบอุปกรณ์</p>
			<p className="text-xs text-center max-w-xs">เพิ่มอุปกรณ์ใหม่โดยการเข้าสู่ระบบจากอุปกรณ์อื่น</p>
		</div>
	);
});

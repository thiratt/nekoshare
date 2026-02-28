import { memo, useMemo } from "react";

import { LuCircle, LuCopy, LuSettings, LuTrash2, LuUserCheck } from "react-icons/lu";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";

import type { DeviceStatus, Os, UiDevice } from "@workspace/app-ui/types/device";

import { capitalize, PLATFORM_ICONS, STATUS_CONFIG } from "./constants";

interface DeviceIconProps {
	platform: Os;
	size?: number;
}

interface DeviceStatusBadgeProps {
	status: DeviceStatus;
}

interface DeviceCardProps {
	device: UiDevice;
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
						<div className="flex gap-1 items-center">
							{device.isCurrent ? (
								<Badge className="bg-amber-500 text-white dark:bg-amber-600" variant="secondary">
									<LuUserCheck className="fill-current" />
									Current
								</Badge>
							) : (
								<DeviceStatusBadge status={device.status} />
							)}
						</div>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				<div className="space-y-1 text-sm text-muted-foreground">
					<div className="flex justify-between">
						<span>Last active</span>
						<span>{device.lastSeen}</span>
					</div>
					<div className="flex justify-between">
						<span>Operating system</span>
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
						Edit
					</Button>
					{!device.isCurrent && (
						<Button variant="destructive" size="sm" onClick={() => onDelete(device.id)}>
							<LuTrash2 />
							Delete
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
				"border-2 border-dashed rounded-lg text-muted-foreground space-y-4",
			)}
		>
			<LuCopy className="w-8 h-8 mb-2" />
			<p>No devices found</p>
			<p className="text-xs text-center max-w-xs">Sign in from another device to add it to this list.</p>
		</div>
	);
});

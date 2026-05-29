import { memo } from "react";

import { LuCircle } from "react-icons/lu";

import { Badge } from "@workspace/ui/components/badge";
import { cn } from "@workspace/ui/lib/utils";

import type { DeviceStatus } from "@workspace/app-ui/types/device";

import { STATUS_CONFIG } from "../constants";

type DeviceStatusBadgeProps = {
	status: DeviceStatus;
};

export const DeviceStatusBadge = memo(function DeviceStatusBadge({ status }: DeviceStatusBadgeProps) {
	const config = STATUS_CONFIG[status];

	return (
		<Badge className={cn("[&>svg]:size-1.5", config.className)} variant={config.variant}>
			<LuCircle className="size-1 fill-current" />
			{config.label}
		</Badge>
	);
});

import { memo } from "react";

import type { Os } from "@workspace/app-ui/types/device";

import { PLATFORM_ICONS } from "../constants";

type DeviceIconProps = {
	platform: Os;
	size?: number;
};

export const DeviceIcon = memo(function DeviceIcon({ platform, size = 24 }: DeviceIconProps) {
	const IconComponent = PLATFORM_ICONS[platform];
	return <IconComponent size={size} />;
});

import { memo } from "react";

import { LuMonitor } from "react-icons/lu";

import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@workspace/ui/components/empty";

type DeviceEmptyStateProps = {
	description?: string;
	icon?: React.ReactNode;
	title?: string;
};

export const DeviceEmptyState = memo(function DeviceEmptyState({
	description = "ลงชื่อเข้าใช้จากอุปกรณ์อื่นเพื่อเพิ่มเข้ามาในรายการนี้",
	icon,
	title = "ยังไม่มีอุปกรณ์",
}: DeviceEmptyStateProps) {
	return (
		<Empty className="h-full">
			<EmptyHeader>
				<EmptyMedia variant="icon">{icon ?? <LuMonitor />}</EmptyMedia>
				<EmptyTitle>{title}</EmptyTitle>
				<EmptyDescription>{description}</EmptyDescription>
			</EmptyHeader>
		</Empty>
	);
});

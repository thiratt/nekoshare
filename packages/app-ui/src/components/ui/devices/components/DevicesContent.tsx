import type { UiDevice } from "@workspace/app-ui/types/device";

import { DeviceEmptyState } from "./DeviceEmptyState";
import { DeviceRow } from "./DeviceRow";
import { DeviceSection } from "./DeviceSection";
import { DeviceSkeletonRows } from "./DeviceSkeletonRows";

type DevicesContentProps = {
	actionLoading: string | null;
	currentDevices: UiDevice[];
	devicesCount: number;
	loading: boolean;
	onDelete: (deviceId: string) => void;
	onManage: (deviceId: string) => void;
	otherDevices: UiDevice[];
	showEmpty: boolean;
	showNoResults: boolean;
};

export function DevicesContent({
	actionLoading,
	currentDevices,
	devicesCount,
	loading,
	onDelete,
	onManage,
	otherDevices,
	showEmpty,
	showNoResults,
}: DevicesContentProps) {
	if (loading && devicesCount === 0) {
		return <DeviceSkeletonRows />;
	}

	if (showEmpty) {
		return (
			<DeviceEmptyState
				title="ยังไม่มีอุปกรณ์"
				description="ลงชื่อเข้าใช้จากอุปกรณ์อื่นเพื่อเพิ่มเข้ามาในรายการนี้"
			/>
		);
	}

	if (showNoResults) {
		return <DeviceEmptyState title="ไม่พบอุปกรณ์" description="ไม่พบอุปกรณ์ที่ตรงกับคำค้นหา" />;
	}

	return (
		<>
			{currentDevices.length > 0 ? (
				<DeviceSection title="เครื่องนี้" count={currentDevices.length}>
					{currentDevices.map((device) => (
						<DeviceRow
							key={device.id}
							device={device}
							loading={actionLoading === device.id}
							onManage={onManage}
							onDelete={onDelete}
						/>
					))}
				</DeviceSection>
			) : null}

			{otherDevices.length > 0 ? (
				<DeviceSection title="อุปกรณ์อื่น" count={otherDevices.length}>
					{otherDevices.map((device) => (
						<DeviceRow
							key={device.id}
							device={device}
							loading={actionLoading === device.id}
							onManage={onManage}
							onDelete={onDelete}
						/>
					))}
				</DeviceSection>
			) : null}
		</>
	);
}

import { useCallback, useDeferredValue, useMemo, useState } from "react";

import { useToast } from "@workspace/ui/hooks/use-toast";

import { useDevices } from "@workspace/app-ui/hooks/use-devices";
import type { UiDevice } from "@workspace/app-ui/types/device";

import { filterDeviceGroups } from "../utils/device-utils";

export function useDevicesController() {
	const { toast } = useToast();
	const { deleteDevice, devices, error, loading, refresh, updateDevice } = useDevices();

	const [query, setQuery] = useState("");
	const deferredQuery = useDeferredValue(query);
	const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [selectedDevice, setSelectedDevice] = useState<UiDevice | null>(null);
	const [actionLoading, setActionLoading] = useState<string | null>(null);

	const { currentDevices, otherDevices } = useMemo(
		() => filterDeviceGroups(devices, deferredQuery),
		[deferredQuery, devices],
	);

	const visibleCount = currentDevices.length + otherDevices.length;
	const showNoResults = visibleCount === 0 && deferredQuery.trim().length > 0;
	const showEmpty = devices.length === 0 && !loading;

	const handleManage = useCallback(
		(deviceId: string) => {
			const device = devices.find((item) => item.id === deviceId);
			if (!device) return;

			setSelectedDevice(device);
			setIsManageDialogOpen(true);
		},
		[devices],
	);

	const handleDelete = useCallback(
		(deviceId: string) => {
			const device = devices.find((item) => item.id === deviceId);
			if (!device) return;

			setSelectedDevice(device);
			setIsDeleteDialogOpen(true);
		},
		[devices],
	);

	const handleSaveDevice = useCallback(
		async (id: string, name: string) => {
			setActionLoading(id);
			try {
				await updateDevice(id, { name });
				toast.success("บันทึกชื่ออุปกรณ์แล้ว");
			} catch (saveError) {
				const message = saveError instanceof Error ? saveError.message : "ไม่สามารถบันทึกอุปกรณ์ได้";
				toast.error(message);
				throw saveError;
			} finally {
				setActionLoading(null);
			}
		},
		[toast, updateDevice],
	);

	const handleConfirmDelete = useCallback(async () => {
		if (!selectedDevice) return;

		setActionLoading(selectedDevice.id);
		try {
			await deleteDevice(selectedDevice.id);
			toast.success("ลบอุปกรณ์แล้ว");
			setSelectedDevice(null);
		} catch (deleteError) {
			const message = deleteError instanceof Error ? deleteError.message : "ไม่สามารถลบอุปกรณ์ได้";
			toast.error(message);
			throw deleteError;
		} finally {
			setActionLoading(null);
		}
	}, [deleteDevice, selectedDevice, toast]);

	const handleRefresh = useCallback(() => {
		void refresh();
	}, [refresh]);

	const handleClearSearch = useCallback(() => {
		setQuery("");
	}, []);

	return {
		actionLoading,
		currentDevices,
		devices,
		error,
		handleClearSearch,
		handleConfirmDelete,
		handleDelete,
		handleManage,
		handleRefresh,
		handleSaveDevice,
		isDeleteDialogOpen,
		isManageDialogOpen,
		loading,
		otherDevices,
		query,
		selectedDevice,
		setIsDeleteDialogOpen,
		setIsManageDialogOpen,
		setQuery,
		showEmpty,
		showNoResults,
	};
}

export type DevicesController = ReturnType<typeof useDevicesController>;

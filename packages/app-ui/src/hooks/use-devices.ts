import { useCallback, useEffect, useMemo, useState } from "react";

import type { Device, LocalDeviceInfo } from "@workspace/app-ui/types/device";
import {
	fetchDevices,
	transformApiDevice,
	transformLocalDevice,
	updateDevice as updateDeviceApi,
	deleteDevice as deleteDeviceApi,
} from "@workspace/app-ui/lib/device-api";

interface UseDevicesOptions {
	localDeviceInfo: LocalDeviceInfo | null;
}

interface UseDevicesReturn {
	devices: Device[];
	loading: boolean;
	error: string | null;
	refresh: () => Promise<void>;
	updateDevice: (id: string, data: { name: string }) => Promise<void>;
	deleteDevice: (id: string) => Promise<void>;
}

export function useDevices({ localDeviceInfo }: UseDevicesOptions): UseDevicesReturn {
	const [remoteDevices, setRemoteDevices] = useState<Device[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const localDevice = useMemo<Device | null>(() => {
		if (!localDeviceInfo) return null;
		return transformLocalDevice(localDeviceInfo);
	}, [localDeviceInfo]);

	const devices = useMemo(() => {
		const filteredRemote = localDevice ? remoteDevices.filter((d) => d.id !== localDevice.id) : remoteDevices;

		if (localDevice) {
			return [localDevice, ...filteredRemote];
		}
		return filteredRemote;
	}, [localDevice, remoteDevices]);

	const loadDevices = useCallback(
		async (signal?: AbortSignal) => {
			setLoading(true);
			setError(null);

			try {
				const response = await fetchDevices(signal);
				const transformed = response.devices.map((d) => transformApiDevice(d, localDeviceInfo?.id));
				setRemoteDevices(transformed);
			} catch (err) {
				if (err instanceof Error && err.name === "AbortError") {
					return;
				}
				setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
				console.error("Failed to fetch devices:", err);
			} finally {
				setLoading(false);
			}
		},
		[localDeviceInfo?.id]
	);

	useEffect(() => {
		const controller = new AbortController();
		loadDevices(controller.signal);
		return () => controller.abort();
	}, [loadDevices]);

	const refresh = useCallback(async () => {
		await loadDevices();
	}, [loadDevices]);

	const updateDevice = useCallback(async (id: string, data: { name: string }) => {
		try {
			await updateDeviceApi(id, data);
			setRemoteDevices((prev) => prev.map((device) => (device.id === id ? { ...device, ...data } : device)));
		} catch (err) {
			console.error("Failed to update device:", err);
			throw err;
		}
	}, []);

	const deleteDevice = useCallback(
		async (id: string) => {
			if (localDeviceInfo && id === localDeviceInfo.id) {
				throw new Error("ไม่สามารถลบอุปกรณ์ที่กำลังใช้งานอยู่ได้");
			}

			try {
				await deleteDeviceApi(id);
				setRemoteDevices((prev) => prev.filter((device) => device.id !== id));
			} catch (err) {
				console.error("Failed to delete device:", err);
				throw err;
			}
		},
		[localDeviceInfo]
	);

	return {
		devices,
		loading,
		error,
		refresh,
		updateDevice,
		deleteDevice,
	};
}

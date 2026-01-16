import { useCallback, useEffect, useMemo, useState } from "react";

import { useNekoShare } from "@workspace/app-ui/context/nekoshare";
import { useNekoSocket } from "@workspace/app-ui/hooks/useNekoSocket";
import {
	deleteDevice as deleteDeviceApi,
	fetchDevices,
	transformApiDevice,
	updateDevice as updateDeviceApi,
} from "@workspace/app-ui/lib/device-api";
import { PacketType } from "@workspace/app-ui/lib/nk-socket/index";
import type { UiDevice } from "@workspace/app-ui/types/device";
import type { UseDevicesReturn } from "@workspace/app-ui/types/hooks";

import { usePacketRouter } from "./usePacketRouter";

export function useDevices(): UseDevicesReturn {
	const { currentDevice: localDeviceInfo } = useNekoShare();
	const { send } = useNekoSocket();
	const [remoteDevices, setRemoteDevices] = useState<UiDevice[]>([]);

	usePacketRouter({
		[PacketType.DEVICE_UPDATED]: (r) => {
			if (r.success) {
				setRemoteDevices((prev) => prev.map((d) => (d.id === r.data.id ? { ...d, name: r.data.name } : d)));
			}
		},
		[PacketType.DEVICE_REMOVED]: (r) => {
			if (r.success) {
				setRemoteDevices((prev) => prev.filter((d) => d.id !== r.data.id));
			}
		},
		[PacketType.DEVICE_ADDED]: (r) => {
			if (r.success) {
				const newDevice = transformApiDevice(r.data, localDeviceInfo?.id);
				setRemoteDevices((prev) => {
					if (prev.some((d) => d.id === newDevice.id)) return prev;
					return [...prev, newDevice];
				});
			}
		},
	});

	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const devices = useMemo(() => {
		const result = localDeviceInfo
			? remoteDevices.map((d) => ({
					...d,
					isCurrent: d.id === localDeviceInfo.id || d.deviceIdentifier === localDeviceInfo.id,
				}))
			: [...remoteDevices];

		return result.sort((a, b) => {
			if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1;
			if (a.status !== b.status) return a.status === "online" ? -1 : 1;
			return a.name.localeCompare(b.name);
		});
	}, [localDeviceInfo, remoteDevices]);

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

	const updateDevice = useCallback(
		async (id: string, data: { name: string }) => {
			try {
				const payload = JSON.stringify({ id, name: data.name });
				setRemoteDevices((prev) => prev.map((device) => (device.id === id ? { ...device, ...data } : device)));

				send(PacketType.DEVICE_RENAME, (w) => w.writeString(payload));
			} catch (err) {
				console.error("Failed to update device:", err);
				await updateDeviceApi(id, data);
			}
		},
		[send]
	);

	const deleteDevice = useCallback(
		async (id: string) => {
			if (localDeviceInfo && id === localDeviceInfo.id) {
				throw new Error("ไม่สามารถลบอุปกรณ์ที่กำลังใช้งานอยู่ได้");
			}

			try {
				setRemoteDevices((prev) => prev.filter((device) => device.id !== id));
				const payload = JSON.stringify({ id });
				send(PacketType.DEVICE_DELETE, (w) => w.writeString(payload));
			} catch (err) {
				console.error("Failed to delete device:", err);
				await deleteDeviceApi(id);
			}
		},
		[localDeviceInfo, send]
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

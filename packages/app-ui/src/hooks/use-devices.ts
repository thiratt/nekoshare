import { useCallback, useEffect, useMemo, useState } from "react";

import { useNekoShare } from "@workspace/app-ui/context/nekoshare";
import { useNekoSocket } from "@workspace/app-ui/hooks/useNekoSocket";
import {
	deleteDevice as $deleteDevice,
	fetchDevices,
	transformApiDevice,
	updateDevice as $updateDevice,
} from "@workspace/app-ui/lib/device-api";
import { AppError } from "@workspace/app-ui/lib/errors";
import { PacketType } from "@workspace/app-ui/lib/nk-socket/index";
import type { UiDevice } from "@workspace/app-ui/types/device";
import type { UseDevicesReturn } from "@workspace/app-ui/types/hooks";

import { usePacketRouter } from "./usePacketRouter";

export const DeviceErrorCode = {
	CANNOT_DELETE_CURRENT: "CANNOT_DELETE_CURRENT",
	DEVICE_NOT_FOUND: "DEVICE_NOT_FOUND",
	UPDATE_FAILED: "UPDATE_FAILED",
	DELETE_FAILED: "DELETE_FAILED",
	FETCH_FAILED: "FETCH_FAILED",
} as const;

export type DeviceErrorCode = (typeof DeviceErrorCode)[keyof typeof DeviceErrorCode];

interface DevicesState {
	remoteDevices: UiDevice[];
	loading: boolean;
	error: string | null;
}

function sortDevices(devices: UiDevice[]): UiDevice[] {
	return [...devices].sort((a, b) => {
		if (a.isCurrent !== b.isCurrent) {
			return a.isCurrent ? -1 : 1;
		}
		if (a.status !== b.status) {
			return a.status === "online" ? -1 : 1;
		}

		return a.name.localeCompare(b.name);
	});
}

export function useDevices(): UseDevicesReturn {
	const { currentDevice: localDeviceInfo } = useNekoShare();
	const { send } = useNekoSocket();
	const [state, setState] = useState<DevicesState>({
		remoteDevices: [],
		loading: true,
		error: null,
	});

	usePacketRouter({
		[PacketType.DEVICE_UPDATED]: (result) => {
			if (result.status === "success") {
				const updatedDevice = result.data;
				setState((prev) => ({
					...prev,
					remoteDevices: prev.remoteDevices.map((device) =>
						device.id === updatedDevice.id ? { ...device, name: updatedDevice.name } : device,
					),
				}));
			} else {
				console.error("[useDevices] Failed to parse DEVICE_UPDATED packet:", result.error.message);
			}
		},

		[PacketType.DEVICE_REMOVED]: (result) => {
			if (result.status === "success") {
				const removedDevice = result.data;
				setState((prev) => ({
					...prev,
					remoteDevices: prev.remoteDevices.filter((device) => device.id !== removedDevice.id),
				}));
			} else {
				console.error("[useDevices] Failed to parse DEVICE_REMOVED packet:", result.error.message);
			}
		},

		[PacketType.DEVICE_ADDED]: (result) => {
			if (result.status === "success") {
				const addedDevice = result.data;
				const newDevice = transformApiDevice(addedDevice, localDeviceInfo?.id);

				setState((prev) => {
					if (prev.remoteDevices.some((device) => device.id === newDevice.id)) {
						return prev;
					}
					return {
						...prev,
						remoteDevices: [...prev.remoteDevices, newDevice],
					};
				});
			} else {
				console.error("[useDevices] Failed to parse DEVICE_ADDED packet:", result.error.message);
			}
		},
	});

	const devices = useMemo(() => {
		const enrichedDevices = localDeviceInfo
			? state.remoteDevices.map((device) => ({
					...device,
					isCurrent: device.id === localDeviceInfo.id || device.deviceIdentifier === localDeviceInfo.id,
				}))
			: [...state.remoteDevices];

		return sortDevices(enrichedDevices);
	}, [localDeviceInfo, state.remoteDevices]);

	const loadDevices = useCallback(
		async (signal?: AbortSignal) => {
			setState((prev) => ({ ...prev, loading: true, error: null }));

			const result = await fetchDevices(signal);

			if (result.status === "error") {
				if (result.error.isAbortError()) {
					return;
				}

				setState((prev) => ({
					...prev,
					loading: false,
					error: result.error.toUserMessage(),
				}));

				console.error("[useDevices] Failed to fetch devices:", result.error.toDetailedMessage());
				return;
			}

			const transformedDevices = result.data.devices.map((device) =>
				transformApiDevice(device, localDeviceInfo?.id),
			);

			setState({
				remoteDevices: transformedDevices,
				loading: false,
				error: null,
			});
		},
		[localDeviceInfo?.id],
	);

	useEffect(() => {
		const controller = new AbortController();
		loadDevices(controller.signal);
		return () => controller.abort();
	}, [loadDevices]);

	const refresh = useCallback(async (): Promise<void> => {
		await loadDevices();
	}, [loadDevices]);

	const updateDevice = useCallback(
		async (id: string, data: { name: string }): Promise<void> => {
			const previousDevice = state.remoteDevices.find((device) => device.id === id);

			if (!previousDevice) {
				throw new AppError(`Device with ID "${id}" not found`, "INTERNAL" as const, "NOT_FOUND" as const, {
					operation: "Update device",
				});
			}

			setState((prev) => ({
				...prev,
				remoteDevices: prev.remoteDevices.map((device) => (device.id === id ? { ...device, ...data } : device)),
			}));

			try {
				const payload = JSON.stringify({ id, name: data.name });
				send(PacketType.DEVICE_RENAME, (writer) => writer.writeString(payload));
			} catch (error) {
				console.error("[useDevices] WebSocket send failed, falling back to API:", error);

				try {
					await $updateDevice(id, data);
				} catch (apiError) {
					setState((prev) => ({
						...prev,
						remoteDevices: prev.remoteDevices.map((device) => (device.id === id ? previousDevice : device)),
					}));
					throw apiError;
				}
			}
		},
		[state.remoteDevices, send],
	);

	const deleteDevice = useCallback(
		async (id: string): Promise<void> => {
			if (localDeviceInfo && (id === localDeviceInfo.id || id === localDeviceInfo.fingerprint)) {
				throw new AppError(
					"Cannot delete the device you are currently using. Please log out from another device if you want to remove this one.",
					"INTERNAL" as const,
					"VALIDATION" as const,
					{ operation: "Delete device" },
				);
			}

			const previousDevice = state.remoteDevices.find((device) => device.id === id);

			setState((prev) => ({
				...prev,
				remoteDevices: prev.remoteDevices.filter((device) => device.id !== id),
			}));

			try {
				const payload = JSON.stringify({ id });
				send(PacketType.DEVICE_DELETE, (writer) => writer.writeString(payload));
			} catch (error) {
				console.error("[useDevices] WebSocket send failed, falling back to API:", error);

				try {
					await $deleteDevice(id);
				} catch (apiError) {
					if (previousDevice) {
						setState((prev) => ({
							...prev,
							remoteDevices: [...prev.remoteDevices, previousDevice],
						}));
					}
					throw apiError;
				}
			}
		},
		[localDeviceInfo, state.remoteDevices, send],
	);

	return {
		devices,
		loading: state.loading,
		error: state.error,
		refresh,
		updateDevice,
		deleteDevice,
	};
}

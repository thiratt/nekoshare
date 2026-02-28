import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
import type { SocketDevicePresencePayload } from "../lib/nk-socket/payload";

export const DeviceErrorCode = {
	CANNOT_DELETE_CURRENT: "CANNOT_DELETE_CURRENT",
	DEVICE_NOT_FOUND: "DEVICE_NOT_FOUND",
	UPDATE_FAILED: "UPDATE_FAILED",
	DELETE_FAILED: "DELETE_FAILED",
	FETCH_FAILED: "FETCH_FAILED",
} as const;

export type DeviceErrorCode = (typeof DeviceErrorCode)[keyof typeof DeviceErrorCode];

interface DevicesState {
	deviceMap: Map<string, UiDevice>;
	loading: boolean;
	error: string | null;
}

function isCurrentDevice(
	device: UiDevice,
	currentDevice: { id?: string; fingerprint?: string } | undefined,
): boolean {
	if (!currentDevice) {
		return false;
	}

	return (
		device.id === currentDevice.id ||
		(!!device.fingerprint &&
			!!currentDevice.fingerprint &&
			device.fingerprint === currentDevice.fingerprint)
	);
}

function sortDevices(devices: UiDevice[]): UiDevice[] {
	return [...devices].sort((a, b) => {
		if (a.isCurrent !== b.isCurrent) {
			return a.isCurrent ? -1 : 1;
		}
		if (a.status !== b.status) {
			return a.status === "online" ? -1 : 1;
		}
		return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
	});
}

function findDeviceInMap(deviceMap: Map<string, UiDevice>, deviceId: string): UiDevice | undefined {
	return deviceMap.get(deviceId);
}

export function useDevices(): UseDevicesReturn {
	const { currentDevice: localDeviceInfo } = useNekoShare();
	const { send } = useNekoSocket();

	const currentDeviceRef = useRef<{ id?: string; fingerprint?: string } | undefined>({
		id: localDeviceInfo?.id,
		fingerprint: localDeviceInfo?.fingerprint,
	});
	currentDeviceRef.current = {
		id: localDeviceInfo?.id,
		fingerprint: localDeviceInfo?.fingerprint,
	};

	const [state, setState] = useState<DevicesState>({
		deviceMap: new Map(),
		loading: true,
		error: null,
	});

	usePacketRouter({
		[PacketType.DEVICE_UPDATED]: (result) => {
			if (result.status === "success") {
				const updatedDevice = result.data;
				setState((prev) => {
					const newMap = new Map(prev.deviceMap);
					const existing = newMap.get(updatedDevice.id);

					if (existing) {
						if (existing.name !== updatedDevice.name) {
							newMap.set(updatedDevice.id, { ...existing, name: updatedDevice.name });
							return { ...prev, deviceMap: newMap };
						}
					}
					return prev;
				});
			} else {
				console.error("[useDevices] Failed to parse DEVICE_UPDATED packet:", result.error.message);
			}
		},

		[PacketType.DEVICE_REMOVED]: (result) => {
			if (result.status === "success") {
				const removedDevice = result.data;
				setState((prev) => {
					const newMap = new Map(prev.deviceMap);
					const deleted = newMap.delete(removedDevice.id);

					if (deleted) {
						return { ...prev, deviceMap: newMap };
					}
					return prev;
				});
			} else {
				console.error("[useDevices] Failed to parse DEVICE_REMOVED packet:", result.error.message);
			}
		},

		[PacketType.DEVICE_ADDED]: (result) => {
			if (result.status === "success") {
				const addedDevice = result.data;
				const newDevice = transformApiDevice(addedDevice, currentDeviceRef.current);

				setState((prev) => {
					if (prev.deviceMap.has(newDevice.id)) {
						return prev;
					}

					const newMap = new Map(prev.deviceMap);
					newMap.set(newDevice.id, newDevice);
					return { ...prev, deviceMap: newMap };
				});
			} else {
				console.error("[useDevices] Failed to parse DEVICE_ADDED packet:", result.error.message);
			}
		},

		[PacketType.DEVICE_ONLINE]: (result) => {
			if (result.status === "success") {
				const payload = result.data as SocketDevicePresencePayload;
				setState((prev) => {
					const device = findDeviceInMap(prev.deviceMap, payload.deviceId);

					if (device && device.status !== "online") {
						const newMap = new Map(prev.deviceMap);
						newMap.set(device.id, { ...device, status: "online" });
						return { ...prev, deviceMap: newMap };
					}
					return prev;
				});
			} else {
				console.error("[useDevices] Failed to parse DEVICE_ONLINE packet:", result.error.message);
			}
		},

		[PacketType.DEVICE_OFFLINE]: (result) => {
			if (result.status === "success") {
				const payload = result.data as SocketDevicePresencePayload;
				setState((prev) => {
					const device = findDeviceInMap(prev.deviceMap, payload.deviceId);

					if (device && device.status !== "offline") {
						const newMap = new Map(prev.deviceMap);
						newMap.set(device.id, { ...device, status: "offline" });
						return { ...prev, deviceMap: newMap };
					}
					return prev;
				});
			} else {
				console.error("[useDevices] Failed to parse DEVICE_OFFLINE packet:", result.error.message);
			}
		},
	});

	const devices = useMemo(() => {
		const deviceArray = Array.from(state.deviceMap.values());

		const enrichedDevices = deviceArray.map((device) => ({
			...device,
			isCurrent: isCurrentDevice(device, {
				id: localDeviceInfo?.id,
				fingerprint: localDeviceInfo?.fingerprint,
			}),
		}));

		return sortDevices(enrichedDevices);
	}, [localDeviceInfo?.fingerprint, localDeviceInfo?.id, state.deviceMap]);

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

			const deviceMap = new Map<string, UiDevice>();
			for (const apiDevice of result.data.devices) {
				const uiDevice = transformApiDevice(apiDevice, {
					id: localDeviceInfo?.id,
					fingerprint: localDeviceInfo?.fingerprint,
				});
				deviceMap.set(uiDevice.id, uiDevice);
			}

			setState({
				deviceMap,
				loading: false,
				error: null,
			});
		},
		[localDeviceInfo?.fingerprint, localDeviceInfo?.id],
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
			const previousDevice = state.deviceMap.get(id);

			if (!previousDevice) {
				throw new AppError(`Device with ID "${id}" not found`, "INTERNAL" as const, "NOT_FOUND" as const, {
					operation: "Update device",
				});
			}

			setState((prev) => {
				const newMap = new Map(prev.deviceMap);
				newMap.set(id, { ...previousDevice, ...data });
				return { ...prev, deviceMap: newMap };
			});

			try {
				const payload = JSON.stringify({ id, name: data.name });
				send(PacketType.DEVICE_RENAME, (writer) => writer.writeString(payload));
			} catch (error) {
				console.error("[useDevices] WebSocket send failed, falling back to API:", error);

				try {
					await $updateDevice(id, data);
				} catch (apiError) {
					setState((prev) => {
						const newMap = new Map(prev.deviceMap);
						newMap.set(id, previousDevice);
						return { ...prev, deviceMap: newMap };
					});
					throw apiError;
				}
			}
		},
		[state.deviceMap, send],
	);

	const deleteDevice = useCallback(
		async (id: string): Promise<void> => {
			const device = state.deviceMap.get(id);

			if (
				device &&
				isCurrentDevice(device, {
					id: localDeviceInfo?.id,
					fingerprint: localDeviceInfo?.fingerprint,
				})
			) {
				throw new AppError(
					"Cannot delete the device you are currently using. Please log out from another device if you want to remove this one.",
					"INTERNAL" as const,
					"VALIDATION" as const,
					{ operation: "Delete device" },
				);
			}

			if (localDeviceInfo?.fingerprint && device?.fingerprint === localDeviceInfo.fingerprint) {
				throw new AppError(
					"Cannot delete the device you are currently using.",
					"INTERNAL" as const,
					"VALIDATION" as const,
					{ operation: "Delete device" },
				);
			}

			const previousDevice = device;

			setState((prev) => {
				const newMap = new Map(prev.deviceMap);
				newMap.delete(id);
				return { ...prev, deviceMap: newMap };
			});

			try {
				const payload = JSON.stringify({ id });
				send(PacketType.DEVICE_DELETE, (writer) => writer.writeString(payload));
			} catch (error) {
				console.error("[useDevices] WebSocket send failed, falling back to API:", error);

				try {
					await $deleteDevice(id);
				} catch (apiError) {
					if (previousDevice) {
						setState((prev) => {
							const newMap = new Map(prev.deviceMap);
							newMap.set(id, previousDevice);
							return { ...prev, deviceMap: newMap };
						});
					}
					throw apiError;
				}
			}
		},
		[localDeviceInfo?.id, localDeviceInfo?.fingerprint, state.deviceMap, send],
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

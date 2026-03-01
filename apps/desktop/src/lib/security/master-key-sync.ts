import { xfetch } from "@workspace/app-ui/lib/xfetch";

import { ensureMasterKeyFile, removeMasterKeyFile } from "./master-key";

const ONLINE_THRESHOLD_MS = 60 * 1000;

type DeviceListItem = {
	id: string;
	lastActiveAt?: string | Date | null;
};

type DevicesListResponse = {
	devices: DeviceListItem[];
	total: number;
};

type ApiSuccessEnvelope<T> = {
	success: true;
	data: T;
};

function isOnline(lastActiveAt: string | Date | null | undefined): boolean {
	if (!lastActiveAt) {
		return false;
	}

	const date = lastActiveAt instanceof Date ? lastActiveAt : new Date(lastActiveAt);
	return Date.now() - date.getTime() < ONLINE_THRESHOLD_MS;
}

async function hasOnlinePeerDevice(currentDeviceId: string): Promise<boolean> {
	const response = await xfetch("devices", {
		method: "GET",
		operation: "List devices for master key bootstrap",
	});

	const payload = (await response.json()) as ApiSuccessEnvelope<DevicesListResponse> | { message?: string };
	if (!response.ok || !("success" in payload) || payload.success !== true) {
		const message = "message" in payload && typeof payload.message === "string" ? payload.message : "Request failed";
		throw new Error(message);
	}

	const peerDevices = payload.data.devices.filter((device) => device.id !== currentDeviceId);
	return peerDevices.some((device) => isOnline(device.lastActiveAt));
}

export async function syncMasterKeyForDevice(deviceId: string): Promise<void> {
	const hasOnlinePeer = await hasOnlinePeerDevice(deviceId);
	if (!hasOnlinePeer) {
		await ensureMasterKeyFile();
	}
}

export async function clearMasterKeyForCurrentSession(): Promise<void> {
	await removeMasterKeyFile();
}

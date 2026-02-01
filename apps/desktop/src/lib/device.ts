import { invoke } from "@tauri-apps/api/core";

import { xfetch } from "@workspace/app-ui/lib/xfetch";
import type {
  ApiDeviceRegistrationPayload,
  LocalDeviceInfo,
} from "@workspace/app-ui/types/device";

interface DeviceInfoWithKey {
  device_info: LocalDeviceInfo;
  fingerprint: string;
}

export async function getDeviceInfo(): Promise<LocalDeviceInfo> {
  const result = await invoke<LocalDeviceInfo>("ns_get_device_info");
  return result;
}

export async function getDeviceInfoWithKey(): Promise<LocalDeviceInfo> {
  const result = await invoke<DeviceInfoWithKey>("ns_get_device_info_with_key");
  return {
    ...result.device_info,
    fingerprint: result.fingerprint,
  };
}

function toRegistrationPayload(
  deviceInfo: LocalDeviceInfo,
): ApiDeviceRegistrationPayload {
  return {
    id: deviceInfo.id,
    name: deviceInfo.name,
    platform: deviceInfo.platform,
    battery: deviceInfo.battery,
    ip: deviceInfo.ip,
    fingerprint: deviceInfo.fingerprint,
  };
}

export async function registerDevice(): Promise<void> {
  const deviceInfo = await getDeviceInfo();

  const payload = toRegistrationPayload(deviceInfo);

  const response = await xfetch(`devices/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to register device");
  }
}

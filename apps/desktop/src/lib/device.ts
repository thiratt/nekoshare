import { invoke } from "@tauri-apps/api/core";

import { xfetch } from "@workspace/app-ui/lib/xfetch";
import type {
  ApiDeviceRegistrationPayload,
  LocalDeviceInfo,
} from "@workspace/app-ui/types/device";

export async function getDeviceInfo(): Promise<LocalDeviceInfo> {
  return invoke<LocalDeviceInfo>("ns_get_device_info");
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

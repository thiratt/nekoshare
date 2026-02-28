import { invoke } from "@tauri-apps/api/core";

import { xfetch } from "@workspace/app-ui/lib/xfetch";
import type {
  ApiDeviceRegistrationPayload,
  LocalDeviceInfo,
} from "@workspace/app-ui/types/device";

export async function getDeviceInfo(): Promise<LocalDeviceInfo> {
  const result = await invoke<{
    device_info: LocalDeviceInfo;
    fingerprint: string;
  }>("ns_get_device_info");
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

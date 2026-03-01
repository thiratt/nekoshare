import { invoke } from "@tauri-apps/api/core";

import { xfetch } from "@workspace/app-ui/lib/xfetch";
import type {
  ApiDeviceRegistrationPayload,
  ApiDeviceRegistrationResponse,
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

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  message?: string;
};

export async function registerDevice(): Promise<ApiDeviceRegistrationResponse> {
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

  const result = (await response.json()) as ApiEnvelope<ApiDeviceRegistrationResponse>;
  if (!result.success || !result.data) {
    throw new Error(result.message || "Failed to parse register device response");
  }

  return result.data;
}

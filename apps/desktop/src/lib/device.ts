import { invoke } from "@tauri-apps/api/core";

import { xfetch } from "@workspace/app-ui/lib/xfetch";
import type {
  ApiDeviceRegistrationPayload,
  LocalDeviceInfo,
} from "@workspace/app-ui/types/device";

export async function getDeviceInfo(): Promise<LocalDeviceInfo> {
  return invoke<LocalDeviceInfo>("ns_get_device_info");
}

/**
 * Generate a simple public key placeholder
 * TODO: Implement proper key generation for E2E encryption
 * For now, generate a placeholder. In production, use proper crypto
 */
function generatePublicKey(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

function toRegistrationPayload(
  deviceInfo: LocalDeviceInfo,
): ApiDeviceRegistrationPayload {
  return {
    id: deviceInfo.id,
    name: deviceInfo.name,
    platform: deviceInfo.platform,
    publicKey: generatePublicKey(),
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

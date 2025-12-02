import { invoke } from "@tauri-apps/api/core";
import type {
  DeviceInfo,
  DeviceRegistration,
} from "@workspace/app-ui/types/device";
import { xfetch } from "@workspace/app-ui/lib/xfetch";

export async function getDeviceInfo(): Promise<DeviceInfo> {
  return invoke<DeviceInfo>("get_device_info");
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

function toRegistrationPayload(deviceInfo: DeviceInfo): DeviceRegistration {
  let platform: DeviceRegistration["platform"] = "other";
  if (deviceInfo.platform === "windows") platform = "windows";
  else if (deviceInfo.platform === "android") platform = "android";

  return {
    id: deviceInfo.id,
    name: deviceInfo.name,
    platform,
    publicKey: generatePublicKey(),
    batterySupported: deviceInfo.battery.supported,
    batteryCharging: deviceInfo.battery.charging,
    batteryPercent: deviceInfo.battery.percent,
    lastIp: deviceInfo.ipv4,
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

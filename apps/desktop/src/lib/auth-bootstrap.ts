import { registerDevice } from "@/lib/device";
import { syncMasterKeyForDevice } from "@/lib/security/master-key-sync";

export async function bootstrapAuthenticatedDesktopSession(): Promise<void> {
  const registration = await registerDevice();
  await syncMasterKeyForDevice(registration.device.id);
}

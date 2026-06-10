import { trustedDevicesApi } from "@/lib/api-client/trusted-devices";
import { getOrCreateDeviceSecret } from "./device-storage";

/** Updates server lastUsedAt for this browser's trusted device (non-blocking). */
export async function recordTrustedDeviceUnlock(userId: string): Promise<void> {
  try {
    const { deviceId } = await getOrCreateDeviceSecret(userId);
    await trustedDevicesApi.touch({ deviceId });
  } catch {
    // Device may not be registered yet, or user may be offline.
  }
}

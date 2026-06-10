import { trustedDevicesApi } from "@/lib/api-client/trusted-devices";
import { getOrCreateDeviceSecret, clearLocalVaultData } from "./device-storage";
import { lockVaultSession } from "./vault-session";

/** Updates server lastUsedAt for this browser's trusted device (non-blocking). */
export async function recordTrustedDeviceUnlock(userId: string): Promise<void> {
  try {
    const { deviceId } = await getOrCreateDeviceSecret(userId);
    const result = await trustedDevicesApi.touch({ deviceId });
    if (result.state === "revoked") {
      await clearLocalVaultData(userId);
      lockVaultSession();
    }
  } catch {
    // Device may not be registered yet, or user may be offline.
  }
}

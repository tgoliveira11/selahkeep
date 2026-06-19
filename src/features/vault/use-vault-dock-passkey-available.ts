"use client";

import type { VaultStatus } from "@/lib/api-client/vault";
import { isPrfExtensionSupported } from "@/lib/passkey/prf-support";

export type VaultDockPasskeyAvailability = {
  hasEnvelope: boolean;
  showPasskey: boolean;
  prfExplicitlyUnsupported: boolean;
};

/** Whether passkey PRF quick unlock may appear in the Vault Status Dock. */
export function useVaultDockPasskeyAvailable(
  vaultStatus: VaultStatus | null
): VaultDockPasskeyAvailability {
  const hasEnvelope =
    vaultStatus?.availableUnlockMethods?.passkey ?? vaultStatus?.hasPasskey ?? false;

  if (!hasEnvelope) {
    return { hasEnvelope: false, showPasskey: false, prfExplicitlyUnsupported: false };
  }

  if (!isPrfExtensionSupported()) {
    return { hasEnvelope: true, showPasskey: false, prfExplicitlyUnsupported: true };
  }

  return { hasEnvelope: true, showPasskey: true, prfExplicitlyUnsupported: false };
}

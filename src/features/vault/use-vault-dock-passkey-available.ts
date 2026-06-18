"use client";

import { useEffect, useState } from "react";
import type { VaultStatus } from "@/lib/api-client/vault";
import {
  detectPasskeyPrfSupport,
  type PasskeyPrfSupport,
} from "@/lib/passkey/prf-support";

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
  const [prfSupport, setPrfSupport] = useState<PasskeyPrfSupport | null>(null);

  useEffect(() => {
    if (!hasEnvelope) return;
    let cancelled = false;
    void detectPasskeyPrfSupport().then((result) => {
      if (!cancelled) setPrfSupport(result);
    });
    return () => {
      cancelled = true;
    };
  }, [hasEnvelope]);

  if (!hasEnvelope) {
    return { hasEnvelope: false, showPasskey: false, prfExplicitlyUnsupported: false };
  }

  if (prfSupport === "unsupported") {
    return { hasEnvelope: true, showPasskey: false, prfExplicitlyUnsupported: true };
  }

  return { hasEnvelope: true, showPasskey: true, prfExplicitlyUnsupported: false };
}

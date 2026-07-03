"use client";

import { useEffect, useState } from "react";
import type { VaultStatus } from "@/lib/api-client/vault";
import {
  detectPasskeyPrfSupport,
  isPrfExtensionSupported,
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
  const [capabilityProbe, setCapabilityProbe] = useState<PasskeyPrfSupport>("unknown");

  useEffect(() => {
    let cancelled = false;
    void detectPasskeyPrfSupport().then((result) => {
      if (!cancelled) setCapabilityProbe(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const hasEnvelope =
    vaultStatus?.availableUnlockMethods?.passkey ?? vaultStatus?.hasPasskey ?? false;

  if (!hasEnvelope) {
    return { hasEnvelope: false, showPasskey: false, prfExplicitlyUnsupported: false };
  }

  const browserBlocksPrf = !isPrfExtensionSupported();
  const capabilityBlocksPrf = capabilityProbe === "unsupported";
  const prfExplicitlyUnsupported = browserBlocksPrf || capabilityBlocksPrf;
  const showPasskey = !prfExplicitlyUnsupported;

  return { hasEnvelope: true, showPasskey, prfExplicitlyUnsupported };
}
